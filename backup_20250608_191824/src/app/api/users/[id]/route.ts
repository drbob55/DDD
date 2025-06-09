// src/app/api/users/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { isValidRole, isValidSex } from "@/lib/constants";

const ADMIN_PIN = process.env.ADMIN_PIN || "123456";

// GET: Get single user by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        username: true,
        phone: true,
        role: true,
        sex: true,
        dateOfBirth: true,
        isVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Update user (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      role,
      username,
      sex,
      dateOfBirth,
      isVerified,
      pin,
    } = await req.json();

    // Admin PIN check
    if (!pin || pin !== ADMIN_PIN) {
      return NextResponse.json(
        { error: "Invalid or missing admin PIN." },
        { status: 401 }
      );
    }

    // Prepare update data
    const updateData: any = {};

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (firstName !== undefined || lastName !== undefined) {
      // Update full name if either name changes
      const user = await prisma.user.findUnique({ where: { id: params.id } });
      if (user) {
        updateData.name = `${firstName || user.firstName} ${lastName || user.lastName}`;
      }
    }
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (username !== undefined) updateData.username = username;
    if (isVerified !== undefined) updateData.isVerified = isVerified;

    if (role !== undefined) {
      if (!isValidRole(role)) {
        return NextResponse.json(
          { error: "Invalid role provided." },
          { status: 400 }
        );
      }
      updateData.role = role;
    }

    if (sex !== undefined) {
      if (!isValidSex(sex)) {
        return NextResponse.json(
          { error: "Invalid sex option provided." },
          { status: 400 }
        );
      }
      updateData.sex = sex;
    }

    if (dateOfBirth !== undefined) {
      updateData.dateOfBirth = new Date(dateOfBirth);
    }

    // Handle password update
    if (password) {
      if (password.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters." },
          { status: 400 }
        );
      }
      updateData.password = await hash(password, 10);
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        username: true,
        sex: true,
        dateOfBirth: true,
        isVerified: true,
      },
    });

    return NextResponse.json({ user });
  } catch (err: any) {
    console.error("Error updating user:", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "Email or username already in use." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Delete user (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { pin } = await req.json();

    // Admin PIN check
    if (!pin || pin !== ADMIN_PIN) {
      return NextResponse.json(
        { error: "Invalid or missing admin PIN." },
        { status: 401 }
      );
    }

    await prisma.user.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (err: any) {
    if (err.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}