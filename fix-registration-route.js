// fix-registration-route.js
const fs = require('fs');
const path = require('path');

const correctRouteContent = `import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';

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
    const hashedPassword = await hash(password, 10);

    // Generate unique 8-digit user id (string)
    let uniqueId = generateUserId();
    // Ensure uniqueness
    while (await prisma.user.findUnique({ where: { id: uniqueId } })) {
      uniqueId = generateUserId();
    }

    // Generate verification token
    const confirmationToken = generateVerificationCode();

    // Create user - matching YOUR schema exactly
    const user = await prisma.user.create({
      data: {
        id: uniqueId,                    // NOT userId
        firstName,
        lastName,
        name: \`\${firstName} \${lastName}\`,
        email,
        password: hashedPassword,
        phone: phone || null,
        role: role || 'PATIENT',
        username: null,                  // Optional in your schema
        sex: 'PREFER_NOT_TO_SAY',       // Required in your schema
        dateOfBirth: new Date('2000-01-01'), // Required in your schema
        confirmed: false,                // NOT isVerified
        confirmationToken: confirmationToken,
      }
    });

    console.log('User created successfully:', user.id);

    // Log verification code (in production, send via email/SMS)
    if (verificationMethod === 'email' || verificationMethod === 'both') {
      console.log(\`Email verification code for \${email}: \${confirmationToken}\`);
    }
    
    if ((verificationMethod === 'phone' || verificationMethod === 'both') && phone) {
      console.log(\`Phone verification code for \${phone}: \${confirmationToken}\`);
    }

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Please check your email/phone for verification code.',
      userId: user.id,
      verificationMethod
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A user with this email or phone already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}`;

// Check current file
const routePath = path.join(process.cwd(), 'src/app/api/auth/register/route.ts');
console.log('Checking registration route at:', routePath);

if (fs.existsSync(routePath)) {
  const currentContent = fs.readFileSync(routePath, 'utf8');
  
  // Check if it has the wrong fields
  if (currentContent.includes('userId:') || currentContent.includes('isVerified:')) {
    console.log('❌ Found old registration route with wrong field names');
    console.log('✅ Updating to correct version...');
    
    // Backup old file
    fs.writeFileSync(routePath + '.backup', currentContent);
    console.log('   Backed up old file to route.ts.backup');
    
    // Write new content
    fs.writeFileSync(routePath, correctRouteContent);
    console.log('   Updated registration route with correct field names');
    console.log('\n🚀 Please restart your Next.js server now!');
    console.log('   1. Press Ctrl+C to stop the server');
    console.log('   2. Run: npm run dev');
  } else {
    console.log('✅ Registration route looks correct');
    
    // Check specific fields
    console.log('\nChecking field names:');
    console.log('  Uses "id":', currentContent.includes('id: uniqueId'));
    console.log('  Uses "confirmed":', currentContent.includes('confirmed:'));
    console.log('  Uses "confirmationToken":', currentContent.includes('confirmationToken:'));
  }
} else {
  console.log('❌ Registration route not found!');
  console.log('Creating it now...');
  
  // Create directory if needed
  const dir = path.dirname(routePath);
  fs.mkdirSync(dir, { recursive: true });
  
  // Write file
  fs.writeFileSync(routePath, correctRouteContent);
  console.log('✅ Created registration route');
}