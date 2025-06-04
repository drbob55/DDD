// src/app/api/auth/[...nextauth]/route.ts
import { prisma } from "@/lib/prisma";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

// Define and export authOptions
export const authOptions = {
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
          const isPasswordValid = await compare(credentials.password, user.password);
          
          if (!isPasswordValid) {
            console.log("Invalid password for user:", user.email);
            return null;
          }
          
          // Check if user account is verified (using correct field name)
          if (!user.isVerified) {
            console.log("User account not verified:", user.email);
            // You might want to throw an error or handle this differently
            throw new Error("Please verify your account first");
          }
          
          // Return user object for session
          return {
            id: user.id,
            userId: user.userId, // Include the 8-digit userId
            name: user.name,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
          };
        } catch (error) {
          console.error("Auth error:", error);
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
      }
      return session;
    }
  },
  session: { 
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/",  // Changed to home page since that's where your login form is
    error: "/",   // Redirect errors to home page
  },
  secret: process.env.NEXTAUTH_SECRET, // Make sure this is set in your .env file
  debug: process.env.NODE_ENV === "development", // Enable debug in development
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };