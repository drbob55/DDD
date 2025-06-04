// create-api-routes.js
const fs = require('fs');
const path = require('path');

// API route contents
const apiRoutes = {
  'app/api/users/exists/route.ts': `import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier } = body;

    if (!identifier) {
      return NextResponse.json(
        { exists: false, error: 'Identifier is required' },
        { status: 400 }
      );
    }

    // Check if user exists by email, username, or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier },
          { phone: identifier }
        ]
      }
    });

    return NextResponse.json({ exists: !!user });
  } catch (error) {
    console.error('Error checking user existence:', error);
    return NextResponse.json(
      { exists: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}`,

  'app/api/auth/login/route.ts': `import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Email/username and password are required' },
        { status: 400 }
      );
    }

    // Find user by email, username, or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier },
          { phone: identifier }
        ]
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user is verified
    if (!user.isVerified) {
      return NextResponse.json(
        { error: 'Please verify your account first' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create session or JWT token here
    // For now, we'll just return success with redirect URL based on role
    const redirectUrl = user.role === 'ADMIN' ? '/admin' : 
                       user.role === 'DENTIST' ? '/dentist' : 
                       user.role === 'PATIENT' ? '/patient' : '/dashboard';

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      redirectUrl
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}`,

  'app/api/auth/register/route.ts': `import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Generate random 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate unique username from email
function generateUsername(email: string): string {
  const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  return \`\${baseUsername}\${Math.floor(Math.random() * 10000)}\`;
}

// Generate 8-digit user ID
function generateUserId(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, phone, password, role, verificationMethod } = body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: 'Required fields are missing' },
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

    // Generate verification codes
    const emailVerificationCode = generateVerificationCode();
    const phoneVerificationCode = generateVerificationCode();

    // Create user
    const user = await prisma.user.create({
      data: {
        userId: generateUserId(),
        firstName,
        lastName,
        name: \`\${firstName} \${lastName}\`,
        email,
        phone: phone || null,
        username: generateUsername(email),
        password: hashedPassword,
        role: role || 'PATIENT',
        isVerified: false,
        emailVerificationCode,
        phoneVerificationCode: phone ? phoneVerificationCode : null,
        verificationMethod
      }
    });

    // Send verification email/SMS based on verificationMethod
    // TODO: Implement email/SMS sending logic here
    if (verificationMethod === 'email' || verificationMethod === 'both') {
      // Send email with emailVerificationCode
      console.log(\`Email verification code for \${email}: \${emailVerificationCode}\`);
    }
    
    if ((verificationMethod === 'phone' || verificationMethod === 'both') && phone) {
      // Send SMS with phoneVerificationCode
      console.log(\`Phone verification code for \${phone}: \${phoneVerificationCode}\`);
    }

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Please check your email/phone for verification code.',
      userId: user.id
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}`,

  'app/api/auth/verify/route.ts': `import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code, verificationType = 'email' } = body;

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and verification code are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already verified
    if (user.isVerified) {
      return NextResponse.json(
        { error: 'User is already verified' },
        { status: 400 }
      );
    }

    // Verify the code based on type
    let isValidCode = false;
    if (verificationType === 'email' && user.emailVerificationCode === code) {
      isValidCode = true;
    } else if (verificationType === 'phone' && user.phoneVerificationCode === code) {
      isValidCode = true;
    }

    if (!isValidCode) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Update user as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        emailVerificationCode: null,
        phoneVerificationCode: null
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Account verified successfully'
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}`
};

// Create directories and files
console.log('🚀 Creating API routes...\n');

Object.entries(apiRoutes).forEach(([filePath, content]) => {
  const fullPath = path.join(process.cwd(), filePath);
  const dirPath = path.dirname(fullPath);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${dirPath}`);
  }
  
  // Write file
  fs.writeFileSync(fullPath, content);
  console.log(`✅ Created: ${filePath}`);
});

console.log('\n✨ All API routes created successfully!');
console.log('\n🔧 Next steps:');
console.log('1. Restart your Next.js development server');
console.log('2. The API routes should now be available');
console.log('3. Test by visiting: http://localhost:3000/api/test-basic');
console.log('\n📝 Available endpoints:');
console.log('- POST /api/users/exists');
console.log('- POST /api/auth/login');
console.log('- POST /api/auth/register');
console.log('- POST /api/auth/verify');