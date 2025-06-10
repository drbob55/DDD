// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory, prisma, BusinessError, ValidationError, NotFoundError } from "@dental/database";
import bcrypt from 'bcryptjs';
import { 
  SEX_OPTIONS, 
  USER_ROLES,
  ACTIVITY_TYPE,
  TARGET_TYPE,
  LOG_SEVERITY,
  NOTIFICATION_TYPE,
  NOTIFICATION_CATEGORY,
  VERIFICATION_METHODS,
  BUSINESS_RULES
} from "@dental/shared/constants";

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
    console.log('Registration request:', {
      email: body.email,
      hasPhone: !!body.phone,
      hasPassword: !!body.password
    });
    
    const { firstName, lastName, email, phone, password, verificationMethod } = body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({
        success: false,
        error: 'First name, last name, email, and password are required'
      }, { status: 400 });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email format'
      }, { status: 400 });
    }

    // Password validation
    if (password.length < BUSINESS_RULES.MIN_PASSWORD_LENGTH) {
      return NextResponse.json({
        success: false,
        error: `Password must be at least ${BUSINESS_RULES.MIN_PASSWORD_LENGTH} characters`
      }, { status: 400 });
    }

    // Phone validation if provided
    if (phone && !/^\+?\d{10,}$/.test(phone.replace(/\s/g, ""))) {
      return NextResponse.json({
        success: false,
        error: 'Invalid phone number format'
      }, { status: 400 });
    }

    const userRepo = repositoryFactory.createUserRepository();

    // Check if user already exists by email
    try {
      const existingUser = await userRepo.findByEmail(email.toLowerCase());
      if (existingUser) {
        // Log attempt to register with existing email
        await prisma.log.create({
          data: {
            action: ACTIVITY_TYPE.USER_CREATED,
            targetType: TARGET_TYPE.USER,
            description: `Registration attempt with existing email: ${email}`,
            severity: LOG_SEVERITY.WARNING,
            metadata: {
              email: email.toLowerCase(),
              existingUserId: existingUser.id
            }
          }
        }).catch(() => {});

        return NextResponse.json({
          success: false,
          error: 'User with this email already exists. Please sign in instead.'
        }, { status: 409 });
      }
    } catch (error) {
      if (!(error instanceof NotFoundError)) {
        throw error;
      }
    }

    // Check by phone if provided
    if (phone) {
      try {
        const existingUserByPhone = await userRepo.findByPhone(phone.replace(/\s/g, ""));
        if (existingUserByPhone) {
          await prisma.log.create({
            data: {
              action: ACTIVITY_TYPE.USER_CREATED,
              targetType: TARGET_TYPE.USER,
              description: `Registration attempt with existing phone: ${phone}`,
              severity: LOG_SEVERITY.WARNING,
              metadata: {
                phone: phone.replace(/\s/g, ""),
                existingUserId: existingUserByPhone.id
              }
            }
          }).catch(() => {});

          return NextResponse.json({
            success: false,
            error: 'User with this phone number already exists'
          }, { status: 409 });
        }
      } catch (error) {
        if (!(error instanceof NotFoundError)) {
          throw error;
        }
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, BUSINESS_RULES.BCRYPT_ROUNDS || 10);

    // Generate unique IDs
    const uniqueId = await generateUniqueId(userRepo);
    const uniqueUserId = await generateUniqueUserId(userRepo);

    // Generate verification code
    const verificationCode = generateVerificationCode();

    // Determine verification method
    const finalVerificationMethod = verificationMethod || 
      (phone ? VERIFICATION_METHODS.BOTH : VERIFICATION_METHODS.EMAIL);

    // Create user - ONLY PATIENTS can register through this endpoint
    const user = await userRepo.create({
      id: uniqueId,
      userId: uniqueUserId,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone: phone ? phone.replace(/\s/g, "") : null,
      role: USER_ROLES.PATIENT, // Always PATIENT for public registration
      sex: SEX_OPTIONS.PREFER_NOT_TO_SAY,
      dateOfBirth: new Date('2000-01-01'), // Should be collected in profile completion
      isVerified: false,
      isActive: true,
      profileCompleted: false,
      // Store verification codes based on method
      emailVerificationCode: [VERIFICATION_METHODS.EMAIL, VERIFICATION_METHODS.BOTH].includes(finalVerificationMethod) 
        ? verificationCode : null,
      phoneVerificationCode: [VERIFICATION_METHODS.PHONE, VERIFICATION_METHODS.BOTH].includes(finalVerificationMethod) 
        ? verificationCode : null,
      verificationMethod: finalVerificationMethod,
      failedLoginAttempts: 0
    });

    console.log('Patient registered successfully:', user.id);

    // Create notifications
    const notificationRepo = repositoryFactory.createNotificationRepository();
    
    try {
      // Welcome notification
      await notificationRepo.create({
        userId: user.id,
        title: 'Welcome to Dental Platform!',
        message: 'Please verify your account to get started.',
        type: NOTIFICATION_TYPE.INFO,
        category: NOTIFICATION_CATEGORY.ACCOUNT,
        actionUrl: '/auth/verify',
        actionLabel: 'Verify Account',
        priority: 'high'
      });

      // Verification notification
      await notificationRepo.create({
        userId: user.id,
        title: 'Verify Your Account',
        message: `Your verification code is: ${verificationCode}`,
        type: NOTIFICATION_TYPE.SYSTEM,
        category: NOTIFICATION_CATEGORY.ACCOUNT,
        priority: 'high',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });
    } catch (error) {
      console.error('Failed to create notifications:', error);
    }

    // Log successful registration
    await prisma.log.create({
      data: {
        userId: user.id,
        action: ACTIVITY_TYPE.USER_CREATED,
        targetType: TARGET_TYPE.USER,
        targetId: user.id,
        description: `New patient registered: ${user.name}`,
        severity: LOG_SEVERITY.INFO,
        metadata: {
          email: user.email,
          hasPhone: !!user.phone,
          verificationMethod: finalVerificationMethod
        }
      }
    }).catch(() => {});

    // TODO: Send actual verification email/SMS
    if (finalVerificationMethod === VERIFICATION_METHODS.EMAIL || finalVerificationMethod === VERIFICATION_METHODS.BOTH) {
      console.log(`[DEV] Email verification code for ${email}: ${verificationCode}`);
      // await sendVerificationEmail(email, verificationCode);
    }
    
    if ((finalVerificationMethod === VERIFICATION_METHODS.PHONE || finalVerificationMethod === VERIFICATION_METHODS.BOTH) && phone) {
      console.log(`[DEV] SMS verification code for ${phone}: ${verificationCode}`);
      // await sendVerificationSMS(phone, verificationCode);
    }

    // Don't return sensitive data
    const { 
      password: _, 
      emailVerificationCode: __, 
      phoneVerificationCode: ___,
      failedLoginAttempts: ____,
      lockedUntil: _____,
      ...userWithoutSensitiveData 
    } = user;

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Please check your email/phone for verification code.',
      userId: user.id,
      verificationMethod: finalVerificationMethod,
      user: userWithoutSensitiveData
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Log system error
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
    
    if (error instanceof BusinessError) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 400 });
    }
    
    if (error instanceof ValidationError) {
      return NextResponse.json({
        success: false,
        error: error.message,
        field: error.field
      }, { status: 400 });
    }
    
    if (error.code === 'P2002') {
      return NextResponse.json({
        success: false,
        error: 'A user with this email or phone already exists'
      }, { status: 409 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Registration failed. Please try again later.'
    }, { status: 500 });
  }
}

// Helper function to generate unique ID
async function generateUniqueId(userRepo: any): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const id = generateUserId();
    try {
      await userRepo.findById(id);
      // If we get here, ID exists, try again
      attempts++;
    } catch (error) {
      if (error instanceof NotFoundError) {
        // ID doesn't exist, we can use it
        return id;
      }
      throw error;
    }
  }
  
  throw new Error('Failed to generate unique ID after maximum attempts');
}

// Helper function to generate unique userId
async function generateUniqueUserId(userRepo: any): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const userId = generateUserId();
    const users = await userRepo.findMany({
      where: { userId },
      take: 1,
    });
    
    if (users.length === 0) {
      return userId;
    }
    attempts++;
  }
  
  throw new Error('Failed to generate unique userId after maximum attempts');
}