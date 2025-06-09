// src/app/api/users/route.ts
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { ROLES, isValidRole, isValidSex } from "@/lib/constants";

const ADMIN_PIN = process.env.ADMIN_PIN || "123456"; // Set your admin PIN in .env

// GET: List all users (optionally by role)
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const role = url.searchParams.get("role");
    let where: any = {};
    if (role) where.role = role;
    
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        userId: true,  // Add this
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        username: true,
        phone: true,
        role: true,
        sex: true,
        dateOfBirth: true,
        isVerified: true,  // Changed from confirmed
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    
    return NextResponse.json({ users });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Create new user (admin only)
export async function POST(req: NextRequest) {
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
      pin, // PIN for admin only
    } = await req.json();
    
    // Admin PIN check (required for creating users)
    if (!pin || pin !== ADMIN_PIN) {
      return NextResponse.json(
        { error: "Invalid or missing admin PIN." },
        { status: 401 }
      );
    }
    
    // Check for all required fields
    if (!firstName || !lastName || !email || !password || !role) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }
    
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }
    
    if (!isValidRole(role)) {
      return NextResponse.json(
        { error: "Invalid role provided." },
        { status: 400 }
      );
    }
    
    if (sex && !isValidSex(sex)) {
      return NextResponse.json(
        { error: "Invalid sex option provided." },
        { status: 400 }
      );
    }
    
    // Ensure email is unique
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json(
        { error: "Email already registered." },
        { status: 400 }
      );
    }
    
    // Hash password before saving
    const hashed = await hash(password, 10);
    
    // Generate unique 8-digit id (string)
    let uniqueId = Math.floor(10000000 + Math.random() * 90000000).toString();
    // Ensure uniqueness
    while (await prisma.user.findUnique({ where: { id: uniqueId } })) {
      uniqueId = Math.floor(10000000 + Math.random() * 90000000).toString();
    }
    
    // Generate unique 8-digit userId (string) - separate from id
    let uniqueUserId = Math.floor(10000000 + Math.random() * 90000000).toString();
    // Ensure uniqueness
    while (await prisma.user.findUnique({ where: { userId: uniqueUserId } })) {
      uniqueUserId = Math.floor(10000000 + Math.random() * 90000000).toString();
    }
    
    const user = await prisma.user.create({
      data: {
        id: uniqueId,
        userId: uniqueUserId,  // Add this field
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        email,
        password: hashed,
        phone,
        role,
        username: username || null,
        sex: sex || 'PREFER_NOT_TO_SAY',
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date('2000-01-01'),
        isVerified: true,  // Admin-created users are auto-verified
      },
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
    console.error("Error creating user:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}