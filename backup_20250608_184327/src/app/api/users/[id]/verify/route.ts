// src/app/api/users/[id]/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMIN_PIN = process.env.ADMIN_PIN || "123456";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { pin } = await req.json();

    // Verify admin PIN
    if (!pin || pin !== ADMIN_PIN) {
      return NextResponse.json(
        { error: "Invalid or missing admin PIN" },
        { status: 401 }
      );
    }

    // Update user to verified
    const user = await prisma.user.update({
      where: { id: params.id },
      data: { 
        isVerified: true,
        emailVerificationCode: null,
        phoneVerificationCode: null
      },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        email: true,
        isVerified: true,
      }
    });

    return NextResponse.json({ user });
  } catch (err: any) {
    console.error("Error verifying user:", err);
    return NextResponse.json(
      { error: err.message || "Failed to verify user" },
      { status: 500 }
    );
  }
}