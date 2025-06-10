// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@dental/core/infrastructure/prisma/client';
import { hash } from 'bcryptjs';
import { 
  USER_ROLES,
  SEX_OPTIONS,
  VERIFICATION_METHODS,
  validators,
  ACTIVITY_TYPE,
  TARGET_TYPE,
  LOG_SEVERITY,
  BUSINESS_RULES,
  NOTIFICATION_TYPE,
  NOTIFICATION_CATEGORY
} from '@dental/shared/constants';

// Generate random 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Registration request body:', body);
    
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      password, 
      role, 
      verificationMethod,
      sex,
      dateOfBirth 
    } = body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: 'First name, last name, email, and password are required' },
        { status: 400 }
      );
    }

    // Validate password length using constants
    if (password.length < BUSINESS_RULES.MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${BUSINESS_RULES.MIN_PASSWORD_LENGTH} characters` },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Validate phone format if provided
    if (phone && !/^\+?\d{10,}$/.test(phone.replace(/\s/g, ""))) {
      return NextResponse.json(
        { error: 'Please enter a valid phone number' },
        { status: 400 }
      );
    }

    // Validate role using constants
    const userRole = role || USER_ROLES.PATIENT;
    if (!validators.isValidUserRole(userRole)) {
      return NextResponse.json(
        { 
          error: 'Invalid user role', 
          validRoles: Object.values(USER_ROLES) 
        },
        { status: 400 }
      );
    }

    // Only allow patient registration through public endpoint
    if (userRole !== USER_ROLES.PATIENT) {
      return NextResponse.json(
        { error: 'Only patient registration is allowed through this endpoint' },
        { status: 403 }
      );
    }

    // Validate sex if provided
    const userSex = sex || SEX_OPTIONS.PREFER_NOT_TO_SAY;
    if (!validators.isValidSex(userSex)) {
      return NextResponse.json(
        { 
          error: 'Invalid sex option', 
          validOptions: Object.values(SEX_OPTIONS) 
        },
        { status: 400 }
      );
    }

    // Validate verification method
    const method = verificationMethod || VERIFICATION_METHODS.EMAIL;
    if (!Object.values(VERIFICATION_METHODS).includes(method)) {
      return NextResponse.json(
        { 
          error: 'Invalid verification method',
          validMethods: Object.values(VERIFICATION_METHODS)
        },
        { status: 400 }
      );
    }

    // Validate required fields based on verification method
    if (method === VERIFICATION_METHODS.EMAIL && !email) {
      return NextResponse.json(
        { error: 'Email is required for email verification' },
        { status: 400 }
      );
    }
    if (method === VERIFICATION_METHODS.PHONE && !phone) {
      return NextResponse.json(
        { error: 'Phone is required for phone verification' },
        { status: 400 }
      );
    }
    if (method === VERIFICATION_METHODS.BOTH && (!email || !phone)) {
      return NextResponse.json(
        { error: 'Both email and phone are required for dual verification' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          ...(phone ? [{ phone }] : [])
        ]
      }
    });

    if (existingUser) {
      // Log attempt to register with existing credentials
      await prisma.log.create({
        data: {
          action: ACTIVITY_TYPE.USER_CREATED,
          targetType: TARGET_TYPE.USER,
          description: 'Attempted registration with existing email/phone',
          severity: LOG_SEVERITY.WARNING,
          metadata: {
            email: email.toLowerCase(),
            hasPhone: !!phone
          }
        }
      }).catch(() => {}); // Don't fail registration if logging fails

      if (existingUser.email === email.toLowerCase()) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        );
      }
      if (existingUser.phone === phone) {
        return NextResponse.json(
          { error: 'An account with this phone number already exists' },
          { status: 409 }
        );
      }
    }

    // Hash password
    const hashedPassword = await hash(password, 10);

    // Generate verification codes
    const emailCode = generateVerificationCode();
    const phoneCode = generateVerificationCode();

    // Create user with transaction
    const user = await prisma.$transaction(async (tx) => {
      // Create user with validation middleware handling constants
      const newUser = await tx.user.create({
        data: {
          firstName,
          lastName,
          email: email.toLowerCase(),
          password: hashedPassword,
          phone: phone || null,
          username: null,
          sex: userSex,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          role: userRole,
          verificationMethod: method,
          emailVerificationCode: method !== VERIFICATION_METHODS.PHONE ? emailCode : null,
          phoneVerificationCode: method !== VERIFICATION_METHODS.EMAIL ? phoneCode : null,
          isVerified: false,
          isActive: true,
          profileCompleted: false,
          
          // Create default preferences
          preferences: {
            create: {
              emailNotifications: true,
              smsNotifications: method !== VERIFICATION_METHODS.EMAIL,
              appointmentReminders: true,
              caseUpdateAlerts: true,
              marketingEmails: false,
              language: BUSINESS_RULES.DEFAULT_LANGUAGE,
              timezone: BUSINESS_RULES.DEFAULT_TIMEZONE,
              dateFormat: 'MM/DD/YYYY',
              timeFormat: '12h'
            }
          }
        },
        include: {
          preferences: true
        }
      });

      // Log user creation
      await tx.log.create({
        data: {
          userId: newUser.id,
          action: ACTIVITY_TYPE.USER_CREATED,
          targetType: TARGET_TYPE.USER,
          targetId: newUser.id,
          description: `New ${userRole.toLowerCase()} account created`,
          severity: LOG_SEVERITY.INFO,
          metadata: {
            role: userRole,
            verificationMethod: method,
            hasEmail: !!email,
            hasPhone: !!phone
          }
        }
      });

      // Create welcome notification
      await tx.notification.create({
        data: {
          userId: newUser.id,
          title: 'Welcome to Dental Aligner Portal!',
          message: 'Please verify your account to get started. Check your email or phone for the verification code.',
          type: NOTIFICATION_TYPE.INFO,
          category: NOTIFICATION_CATEGORY.USER,
          actionUrl: '/verify',
          actionLabel: 'Verify Account'
        }
      });

      return newUser;
    });

    console.log('User created successfully:', user.id);

    // Log verification codes (in production, send via email/SMS service)
    if (method !== VERIFICATION_METHODS.PHONE && email) {
      // In production: await sendEmail(email, 'Verification Code', `Your code is: ${emailCode}`);
      console.log(`Email verification code for ${email}: ${emailCode}`);
    }
    
    if (method !== VERIFICATION_METHODS.EMAIL && phone) {
      // In production: await sendSMS(phone, `Your verification code is: ${phoneCode}`);
      console.log(`Phone verification code for ${phone}: ${phoneCode}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Please check your email/phone for verification code.',
      userId: user.id,
      verificationMethod: method
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Handle Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A user with this email or phone already exists' },
        { status: 409 }
      );
    }

    // Handle validation errors from middleware
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { 
          error: error.message,
          field: error.field,
          validValues: error.validValues
        },
        { status: 400 }
      );
    }

    // Log unexpected errors
    await prisma.log.create({
      data: {
        action: ACTIVITY_TYPE.SYSTEM_ERROR,
        targetType: TARGET_TYPE.SYSTEM,
        description: 'Registration error',
        severity: LOG_SEVERITY.ERROR,
        errorMessage: error.message,
        errorStack: error.stack,
        metadata: {
          endpoint: '/api/auth/register'
        }
      }
    }).catch(() => {});

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}