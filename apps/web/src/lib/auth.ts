// src/lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import { repositoryFactory, prisma, NotFoundError } from "@dental/database";
import { 
  USER_ROLES,
  validators,
  ACTIVITY_TYPE,
  LOG_SEVERITY,
  TARGET_TYPE,
  BUSINESS_RULES
} from "@dental/shared/constants";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { 
          label: "Email, Phone, or Username", 
          type: "text", 
          placeholder: "Enter your email, phone, or username" 
        },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          // Log failed login attempt - using direct prisma for logging is OK
          await prisma.log.create({
            data: {
              action: ACTIVITY_TYPE.USER_LOGIN,
              targetType: TARGET_TYPE.USER,
              description: "Login failed: Missing credentials",
              severity: LOG_SEVERITY.WARNING,
              metadata: {
                identifier: credentials?.identifier || "none"
              }
            }
          }).catch(() => {}); // Don't fail auth if logging fails
          
          return null;
        }
        
        try {
          const userRepo = repositoryFactory.createUserRepository();
          let user = null;
          
          // Try to find user by email, username, or phone
          try {
            if (credentials.identifier.includes("@")) {
              user = await userRepo.findByEmail(credentials.identifier.toLowerCase());
            }
          } catch (error) {
            if (!(error instanceof NotFoundError)) throw error;
          }
          
          // If not found by email, try username
          if (!user) {
            try {
              user = await userRepo.findByUsername(credentials.identifier);
            } catch (error) {
              if (!(error instanceof NotFoundError)) throw error;
            }
          }
          
          // If not found by username, try phone
          if (!user && /^\+?\d{10,}$/.test(credentials.identifier.replace(/\s/g, ""))) {
            try {
              user = await userRepo.findByPhone(credentials.identifier.replace(/\s/g, ""));
            } catch (error) {
              if (!(error instanceof NotFoundError)) throw error;
            }
          }
          
          if (!user) {
            // Log failed login attempt
            await prisma.log.create({
              data: {
                action: ACTIVITY_TYPE.USER_LOGIN,
                targetType: TARGET_TYPE.USER,
                description: `Login failed: User not found for identifier: ${credentials.identifier}`,
                severity: LOG_SEVERITY.WARNING,
                ipAddress: credentials.ipAddress, // Pass this from the login form if available
                metadata: {
                  identifier: credentials.identifier
                }
              }
            }).catch(() => {});
            
            return null;
          }
          
          // Check if user is active
          if (!user.isActive) {
            await prisma.log.create({
              data: {
                userId: user.id,
                action: ACTIVITY_TYPE.USER_LOGIN,
                targetType: TARGET_TYPE.USER,
                targetId: user.id,
                description: "Login failed: Account is not active",
                severity: LOG_SEVERITY.WARNING
              }
            }).catch(() => {});
            
            return null;
          }
          
          // Check if account is locked
          if (user.lockedUntil && user.lockedUntil > new Date()) {
            const remainingTime = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
            throw new Error(`Account locked. Try again in ${remainingTime} minutes`);
          }
          
          // Verify password
          const isPasswordValid = await bcryptjs.compare(credentials.password, user.password || '');
          
          if (!isPasswordValid) {
            // Increment failed login attempts
            const newFailedAttempts = user.failedLoginAttempts + 1;
            const shouldLock = newFailedAttempts >= BUSINESS_RULES.MAX_LOGIN_ATTEMPTS;
            
            await userRepo.update(user.id, {
              failedLoginAttempts: newFailedAttempts,
              ...(shouldLock && {
                lockedUntil: new Date(Date.now() + 30 * 60 * 1000) // Lock for 30 minutes
              })
            });
            
            // Log failed attempt
            await prisma.log.create({
              data: {
                userId: user.id,
                action: ACTIVITY_TYPE.USER_LOGIN,
                targetType: TARGET_TYPE.USER,
                targetId: user.id,
                description: `Login failed: Invalid password (attempt ${newFailedAttempts})`,
                severity: LOG_SEVERITY.WARNING,
                errorMessage: shouldLock ? "Account locked due to too many failed attempts" : undefined,
                metadata: {
                  attempts: newFailedAttempts,
                  locked: shouldLock
                }
              }
            }).catch(() => {});
            
            if (shouldLock) {
              throw new Error("Too many failed attempts. Account locked for 30 minutes");
            }
            
            return null;
          }
          
          // Check if user account is verified
          if (!user.isVerified) {
            await prisma.log.create({
              data: {
                userId: user.id,
                action: ACTIVITY_TYPE.USER_LOGIN,
                targetType: TARGET_TYPE.USER,
                targetId: user.id,
                description: "Login failed: Account not verified",
                severity: LOG_SEVERITY.INFO
              }
            }).catch(() => {});
            
            throw new Error("Please verify your account first");
          }
          
          // Validate user role
          if (!validators.isValidUserRole(user.role)) {
            await prisma.log.create({
              data: {
                userId: user.id,
                action: ACTIVITY_TYPE.USER_LOGIN,
                targetType: TARGET_TYPE.USER,
                targetId: user.id,
                description: `Login failed: Invalid user role: ${user.role}`,
                severity: LOG_SEVERITY.ERROR,
                errorCode: "INVALID_ROLE"
              }
            }).catch(() => {});
            
            return null;
          }
          
          // Successful login - reset failed attempts and update last login
          await userRepo.update(user.id, { 
            lastLoginAt: new Date(),
            failedLoginAttempts: 0,
            lockedUntil: null
          });
          
          // Create session - using direct prisma for session/log tables is OK
          await prisma.session.create({
            data: {
              userId: user.id,
              token: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
              ipAddress: credentials.ipAddress,
              userAgent: credentials.userAgent,
              lastActivity: new Date(),
              expiresAt: new Date(Date.now() + BUSINESS_RULES.SESSION_TIMEOUT_MINUTES * 60 * 1000)
            }
          }).catch(() => {});
          
          // Log successful login
          await prisma.log.create({
            data: {
              userId: user.id,
              action: ACTIVITY_TYPE.USER_LOGIN,
              targetType: TARGET_TYPE.USER,
              targetId: user.id,
              description: "User logged in successfully",
              severity: LOG_SEVERITY.INFO,
              metadata: {
                role: user.role,
                loginMethod: "credentials"
              }
            }
          }).catch(() => {});
          
          // Get user preferences if they exist
          let preferences = null;
          try {
            preferences = await prisma.userPreferences.findUnique({
              where: { userId: user.id }
            });
          } catch (error) {
            // Preferences might not exist, that's OK
          }
          
          // Return user object for session
          return {
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            sex: user.sex,
            dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString() : null,
            profileCompleted: user.profileCompleted,
            isActive: user.isActive,
            isVerified: user.isVerified,
            // Include preferences
            preferences: preferences ? {
              language: preferences.language,
              timezone: preferences.timezone,
              dateFormat: preferences.dateFormat,
              timeFormat: preferences.timeFormat,
              darkMode: preferences.darkMode
            } : undefined
          };
        } catch (error) {
          console.error("Auth error:", error);
          
          // Log system error
          await prisma.log.create({
            data: {
              action: ACTIVITY_TYPE.SYSTEM_ERROR,
              targetType: TARGET_TYPE.SYSTEM,
              description: "Authentication error",
              severity: LOG_SEVERITY.ERROR,
              errorMessage: error instanceof Error ? error.message : "Unknown error",
              errorStack: error instanceof Error ? error.stack : undefined,
              metadata: {
                identifier: credentials.identifier
              }
            }
          }).catch(() => {});
          
          if (error instanceof Error && (
            error.message === "Please verify your account first" ||
            error.message.includes("Account locked") ||
            error.message.includes("Too many failed attempts")
          )) {
            throw error; // Re-throw specific errors for user feedback
          }
          
          return null;
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Handle token updates
      if (trigger === "update" && session) {
        // Update token with new session data
        return { ...token, ...session.user };
      }
      
      // Store user data in JWT token
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.email = user.email;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.phone = user.phone;
        token.sex = user.sex;
        token.dateOfBirth = user.dateOfBirth;
        token.profileCompleted = user.profileCompleted;
        token.isActive = user.isActive;
        token.isVerified = user.isVerified;
        token.preferences = user.preferences;
      }
      
      return token;
    },
    async session({ session, token }) {
      // Pass user data to session
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.email = token.email as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.phone = token.phone as string | null;
        session.user.sex = token.sex as string | null;
        session.user.dateOfBirth = token.dateOfBirth as string | null;
        session.user.profileCompleted = token.profileCompleted as boolean;
        session.user.isActive = token.isActive as boolean;
        session.user.isVerified = token.isVerified as boolean;
        session.user.preferences = token.preferences as any;
      }
      
      return session;
    },
    async signIn({ user, account, profile }) {
      // Additional sign-in checks
      if (user) {
        // Check if user role is valid
        if (!validators.isValidUserRole(user.role)) {
          return false;
        }
        
        // Check if user is active
        if ('isActive' in user && !user.isActive) {
          return false;
        }
      }
      
      return true;
    }
  },
  events: {
    async signOut({ token }) {
      // Log sign out
      if (token?.id) {
        await prisma.log.create({
          data: {
            userId: token.id as string,
            action: ACTIVITY_TYPE.USER_LOGOUT,
            targetType: TARGET_TYPE.USER,
            targetId: token.id as string,
            description: "User logged out",
            severity: LOG_SEVERITY.INFO
          }
        }).catch(() => {});
        
        // Invalidate all user sessions
        await prisma.session.updateMany({
          where: {
            userId: token.id as string,
            isValid: true
          },
          data: {
            isValid: false
          }
        }).catch(() => {});
      }
    },
    async signIn({ user, isNewUser }) {
      // Additional logging for sign in is already handled in authorize
      // This is called after successful sign in
      if (isNewUser && user?.id) {
        // Send welcome notification for new users
        const notificationRepo = repositoryFactory.createNotificationRepository();
        try {
          await notificationRepo.create({
            userId: user.id,
            title: "Welcome to Dental Platform!",
            message: "Thank you for joining us. Complete your profile to get started.",
            type: NOTIFICATION_TYPE.INFO,
            category: NOTIFICATION_CATEGORY.USER,
            actionUrl: "/settings/profile",
            actionLabel: "Complete Profile"
          });
        } catch (error) {
          console.error("Failed to create welcome notification:", error);
        }
      }
    }
  },
  session: { 
    strategy: "jwt",
    maxAge: BUSINESS_RULES.SESSION_TIMEOUT_MINUTES * 60, // Use constant for session timeout
  },
  pages: {
    signIn: "/",  // Home page where login form is
    error: "/auth/error",   // Dedicated error page
    verifyRequest: "/auth/verify", // Email verification page
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

// Type augmentation for NextAuth
declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    sex: string | null;
    dateOfBirth: string | null;
    profileCompleted: boolean;
    isActive: boolean;
    isVerified: boolean;
    preferences?: {
      language: string;
      timezone: string;
      dateFormat: string;
      timeFormat: string;
      darkMode: boolean;
    };
  }
  
  interface Session {
    user: User;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    sex: string | null;
    dateOfBirth: string | null;
    profileCompleted: boolean;
    isActive: boolean;
    isVerified: boolean;
    preferences?: any;
  }
}