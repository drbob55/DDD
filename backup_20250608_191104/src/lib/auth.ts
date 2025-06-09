// src/lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import { prisma } from "./prisma";

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
          console.log("Missing credentials");
          return null;
        }
        
        try {
          // Try to find the user by email, phone, or username
          const user = await prisma.user.findFirst({
            where: {
              OR: [
                { email: credentials.identifier.toLowerCase() }, // Ensure email is lowercase
                { phone: credentials.identifier },
                { username: credentials.identifier },
              ],
            },
          });
          
          if (!user) {
            console.log("User not found for identifier:", credentials.identifier);
            return null;
          }
          
          // Verify password
          const isPasswordValid = await bcryptjs.compare(credentials.password, user.password);          
          if (!isPasswordValid) {
            console.log("Invalid password for user:", user.email);
            return null;
          }
          
          // Check if user account is verified
          if (!user.isVerified) {
            console.log("User account not verified:", user.email);
            throw new Error("Please verify your account first");
          }
          
          // Update last login if the field exists
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
          }).catch(() => {}); // Fail silently if field doesn't exist
          
          // Return user object for session
          return {
            id: user.id,
            userId: user.userId, // Include the 8-digit userId
            name: user.name,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            sex: user.sex,
            dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString() : null,
            profileCompleted: user.profileCompleted,
          };
        } catch (error) {
          console.error("Auth error:", error);
          if (error instanceof Error && error.message === "Please verify your account first") {
            throw error; // Re-throw verification errors
          }
          return null;
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Store user data in JWT token
      if (user) {
        token.id = user.id;
        token.userId = user.userId;
        token.role = user.role;
        token.email = user.email;
        token.name = user.name;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.phone = user.phone;
        token.sex = user.sex;
        token.dateOfBirth = user.dateOfBirth;
        token.profileCompleted = user.profileCompleted;
      }
      return token;
    },
    async session({ session, token }) {
      // Pass user data to session
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.userId = token.userId as string;
        session.user.role = token.role as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.phone = token.phone as string | null;
        session.user.sex = token.sex as string | null;
        session.user.dateOfBirth = token.dateOfBirth as string | null;
        session.user.profileCompleted = token.profileCompleted as boolean;
      }
      return session;
    }
  },
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/",  // Home page where login form is
    error: "/",   // Redirect errors to home page
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development", // Enable debug in development
};