// src/app/api/users/route.ts
import { repositoryFactory, BusinessError, ValidationError } from "@dental/database";
import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { ROLES, isValidRole, isValidSex } from "@/lib/constants";

const ADMIN_PIN = process.env.ADMIN_PIN || "123456"; // Set your admin PIN in .env

// GET: List all users (optionally by role)
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const role = url.searchParams.get("role");
    
    const userRepo = repositoryFactory.createUserRepository();
    
    // Build filter criteria
    const criteria: any = {};
    if (role) {
      criteria.role = role;
    }
    
    // Get users using repository
    const users = await userRepo.findMany({
      where: criteria,
      orderBy: { createdAt: "desc" },
    });
    
    // Map to return only necessary fields
    const formattedUsers = users.map(user => ({
      id: user.id,
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name,
      email: user.email,
      username: user.username,
      phone: user.phone,
      role: user.role,
      sex: user.sex,
      dateOfBirth: user.dateOfBirth,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    }));
    
    return NextResponse.json({ users: formattedUsers });
  } catch (err: any) {
    console.error("Error fetching users:", err);
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
    
    const userRepo = repositoryFactory.createUserRepository();
    
    // Check if email already exists
    try {
      const existingUser = await userRepo.findByEmail(email);
      if (existingUser) {
        return NextResponse.json(
          { error: "Email already registered." },
          { status: 400 }
        );
      }
    } catch (error) {
      // If NotFoundError, user doesn't exist which is what we want
      if (!(error instanceof Error && error.message.includes("not found"))) {
        throw error;
      }
    }
    
    // Hash password before saving
    const hashedPassword = await hash(password, 10);
    
    // Generate unique 8-digit id (string)
    let uniqueId = Math.floor(10000000 + Math.random() * 90000000).toString();
    // Ensure uniqueness
    while (true) {
      try {
        await userRepo.findById(uniqueId);
        // If we get here, the ID exists, generate a new one
        uniqueId = Math.floor(10000000 + Math.random() * 90000000).toString();
      } catch (error) {
        // ID doesn't exist, we can use it
        break;
      }
    }
    
    // Generate unique 8-digit userId (string) - separate from id
    let uniqueUserId = Math.floor(10000000 + Math.random() * 90000000).toString();
    // Ensure uniqueness
    while (true) {
      const users = await userRepo.findMany({
        where: { userId: uniqueUserId },
        take: 1,
      });
      if (users.length === 0) {
        break;
      }
      uniqueUserId = Math.floor(10000000 + Math.random() * 90000000).toString();
    }
    
    // Create user using repository
    const user = await userRepo.create({
      id: uniqueId,
      userId: uniqueUserId,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      email,
      password: hashedPassword,
      phone: phone || null,
      role,
      username: username || null,
      sex: sex || 'PREFER_NOT_TO_SAY',
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date('2000-01-01'),
      isVerified: true,  // Admin-created users are auto-verified
    });
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    
    return NextResponse.json({ user: userWithoutPassword });
  } catch (err: any) {
    console.error("Error creating user:", err);
    
    if (err instanceof BusinessError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}