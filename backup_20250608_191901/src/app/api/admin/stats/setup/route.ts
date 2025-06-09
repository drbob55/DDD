// app/api/admin/setup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// This route should be removed or secured after initial setup
export async function GET(request: NextRequest) {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (existingAdmin) {
      return NextResponse.json({
        message: 'Admin already exists',
        admin: {
          email: existingAdmin.email,
          username: existingAdmin.username,
          isVerified: existingAdmin.isVerified
        }
      });
    }

    // Generate 8-digit user ID
    const userId = Math.floor(10000000 + Math.random() * 90000000).toString();
    
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.user.create({
      data: {
        userId,
        email: 'admin@alignerportal.com',
        username: 'admin',
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Administrator',
        name: 'System Administrator',
        role: 'ADMIN',
        isVerified: true,
        sex: 'PREFER_NOT_TO_SAY',
        dateOfBirth: new Date('1990-01-01')
      }
    });

    return NextResponse.json({
      message: 'Admin created successfully',
      credentials: {
        email: admin.email,
        username: admin.username,
        password: 'admin123',
        note: 'Please change password after first login'
      }
    });
  } catch (error) {
    console.error('Admin setup error:', error);
    return NextResponse.json(
      { error: 'Failed to create admin user' },
      { status: 500 }
    );
  }
}

// Verify any user by email
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { email },
      data: { 
        isVerified: true,
        emailVerificationCode: null,
        phoneVerificationCode: null
      }
    });

    return NextResponse.json({
      message: 'User verified successfully',
      user: {
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to verify user' },
      { status: 500 }
    );
  }
}