import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

function isStrongPassword(password: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "Missing fields." }, { status: 400 });
    }

    if (!isStrongPassword(password)) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character." },
        { status: 400 }
      );
    }

    // Check if email already registered
    const existing = await prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered." },
        { status: 400 }
      );
    }

    // Example: Only allow one admin registration
    if (role === "admin") {
      const existingAdmin = await prisma.user.findFirst({
        where: { role: "admin" },
      });
      if (existingAdmin) {
        return NextResponse.json(
          { error: "Admin account already exists." },
          { status: 400 }
        );
      }
    }

    const hashedPassword = await hash(password, 10);

    // Optionally set a 'confirmed' field to false for email confirmation
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        confirmed: false, // <-- You need to add this to your Prisma schema!
        confirmationToken: Math.random().toString(36).substring(2, 15), // For future email confirmation
      },
    });

    // TODO: Send confirmation email here (not included in this snippet)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      // confirmationRequired: true,
      // confirmationUrl: `/confirm/${user.confirmationToken}`,
    });
  } catch (error) {
    console.error("❌ Registration API error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
