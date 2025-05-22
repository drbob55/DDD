import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import { compare } from "bcryptjs";

const prisma = new PrismaClient();

// Define and export authOptions
export const authOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "email@domain.com" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;
                const user = await prisma.user.findUnique({ where: { email: credentials.email } });
                if (!user) return null;
                const valid = await compare(credentials.password, user.password || "");
                if (!valid) return null;
                // IMPORTANT: Return id and role
                return { id: user.id, name: user.name, email: user.email, role: user.role };
            }
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            // Store id and role in JWT
            if (user) {
                token.id = user.id;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            // Store id and role in session.user
            if (token && session.user) {
                session.user.id = token.id;
                session.user.role = token.role;
            }
            return session;
        }
    },
    session: { strategy: "jwt" },
    pages: {
        signIn: "/login",
    }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
