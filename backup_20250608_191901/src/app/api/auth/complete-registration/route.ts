import { prisma } from "@/lib/prisma";
import { ROLES, CASE_STATUS, PAYMENT_STATUS, SEX_OPTIONS } from "@/lib/constants";
import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { token, password, username } = await req.json();
    
    // Validate inputs
    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
    }
    
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    
    // Find user with this confirmation token
    const user = await prisma.user.findFirst({
      where: {
        confirmationToken: token,
        confirmed: false,
        role: ROLES.PATIENT,
      },
    });
    
    if (!user) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 });
    }
    
    // Check if username is already taken (if provided)
    if (username) {
      const existingUsername = await prisma.user.findFirst({
        where: {
          username,
          id: { not: user.id },
        },
      });
      
      if (existingUsername) {
        return NextResponse.json({ error: "Username already taken" }, { status: 400 });
      }
    }
    
    // Hash the password
    const hashedPassword = await bcryptjs.hash(password, 12);
    
    // Update user with new password and mark as confirmed
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        username: username || null,
        confirmed: true,
        confirmationToken: null, // Clear the token after use
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
      },
    });
    
    // Log the registration completion
    await prisma.log.create({
      data: {
        userId: updatedUser.id,
        action: "PATIENT_REGISTRATION_COMPLETED",
        targetType: "USER",
        targetId: updatedUser.id,
        details: `Patient ${updatedUser.name} completed registration`,
      },
    });
    
    return NextResponse.json({
      success: true,
      message: "Registration completed successfully",
      user: updatedUser,
    });
    
  } catch (err: any) {
    console.error("Registration completion error:", err);
    return NextResponse.json({ error: "Server error during registration" }, { status: 500 });
  }
}