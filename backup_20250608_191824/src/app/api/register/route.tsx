// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Generate random 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate 8-digit user ID
function generateUserId(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Registration request body:', body);
    
    const { firstName, lastName, email, phone, password, role, verificationMethod } = body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: 'First name, last name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(phone ? [{ phone }] : [])
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email or phone already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate unique 8-digit user id
    let uniqueId = generateUserId();
    // Ensure uniqueness
    while (await prisma.user.findUnique({ where: { id: uniqueId } })) {
      uniqueId = generateUserId();
    }

    // Generate verification code
    const confirmationToken = generateVerificationCode();

    // Create user matching your schema
    const user = await prisma.user.create({
      data: {
        id: uniqueId, // Your schema uses 'id' not 'userId'
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        email,
        password: hashedPassword,
        phone: phone || null,
        role: role || 'PATIENT',
        sex: 'PREFER_NOT_TO_SAY', // Default value
        dateOfBirth: new Date('2000-01-01'), // Default, should be collected properly
        confirmed: false, // Your schema uses 'confirmed' not 'isVerified'
        confirmationToken: confirmationToken, // Store for verification
      }
    });

    console.log('User created successfully:', user.id);

    // Send verification email/SMS based on verificationMethod
    // TODO: Implement email/SMS sending logic here
    if (verificationMethod === 'email' || verificationMethod === 'both') {
      console.log(`Email verification code for ${email}: ${confirmationToken}`);
    }
    
    if ((verificationMethod === 'phone' || verificationMethod === 'both') && phone) {
      console.log(`Phone verification code for ${phone}: ${confirmationToken}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Please check your email/phone for verification code.',
      userId: user.id,
      verificationMethod
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    console.error('Error details:', error.message);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A user with this email or phone already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}