// app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@dental/core/infrastructure/prisma/client';
import { 
  ACTIVITY_TYPE,
  TARGET_TYPE,
  LOG_SEVERITY,
  NOTIFICATION_TYPE,
  NOTIFICATION_CATEGORY,
  VERIFICATION_METHODS
} from '@dental/shared/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phone, code, verificationType = 'email' } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    if (!email && !phone) {
      return NextResponse.json(
        { error: 'Email or phone is required' },
        { status: 400 }
      );
    }

    // Find user by email or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email: email.toLowerCase() }] : []),
          ...(phone ? [{ phone }] : [])
        ]
      }
    });

    if (!user) {
      // Log failed verification attempt
      await prisma.log.create({
        data: {
          action: ACTIVITY_TYPE.USER_LOGIN,
          targetType: TARGET_TYPE.USER,
          description: 'Verification attempted for non-existent user',
          severity: LOG_SEVERITY.WARNING,
          metadata: {
            email: email?.toLowerCase(),
            hasPhone: !!phone
          }
        }
      }).catch(() => {});

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

    // Verify the code based on verification method
    let isValidCode = false;
    
    if (user.verificationMethod === VERIFICATION_METHODS.EMAIL) {
      isValidCode = user.emailVerificationCode === code;
    } else if (user.verificationMethod === VERIFICATION_METHODS.PHONE) {
      isValidCode = user.phoneVerificationCode === code;
    } else if (user.verificationMethod === VERIFICATION_METHODS.BOTH) {
      // For dual verification, either code works
      isValidCode = user.emailVerificationCode === code || user.phoneVerificationCode === code;
    }

    if (!isValidCode) {
      // Log failed verification attempt
      await prisma.log.create({
        data: {
          userId: user.id,
          action: ACTIVITY_TYPE.USER_LOGIN,
          targetType: TARGET_TYPE.USER,
          targetId: user.id,
          description: 'Failed verification attempt - invalid code',
          severity: LOG_SEVERITY.WARNING,
          errorMessage: 'Invalid verification code provided',
          metadata: {
            providedCode: code,
            verificationMethod: user.verificationMethod
          }
        }
      }).catch(() => {});

      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Update user as verified with transaction
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Update user
      const verified = await tx.user.update({
        where: { id: user.id },
        data: {
          isVerified: true,
          emailVerificationCode: null,
          phoneVerificationCode: null,
          profileCompleted: false // Prompt to complete profile next
        }
      });

      // Log successful verification
      await tx.log.create({
        data: {
          userId: user.id,
          action: ACTIVITY_TYPE.USER_UPDATED,
          targetType: TARGET_TYPE.USER,
          targetId: user.id,
          description: 'Account verified successfully',
          severity: LOG_SEVERITY.INFO,
          metadata: {
            verificationMethod: user.verificationMethod,
            verifiedVia: verificationType
          }
        }
      });

      // Create notification
      await tx.notification.create({
        data: {
          userId: user.id,
          title: 'Account Verified!',
          message: 'Your account has been verified successfully. You can now log in and complete your profile.',
          type: NOTIFICATION_TYPE.SUCCESS,
          category: NOTIFICATION_CATEGORY.USER,
          actionUrl: '/settings/profile',
          actionLabel: 'Complete Profile'
        }
      });

      // Create additional notification if profile not completed
      if (!verified.profileCompleted) {
        await tx.notification.create({
          data: {
            userId: user.id,
            title: 'Complete Your Profile',
            message: 'Please take a moment to complete your profile for a better experience.',
            type: NOTIFICATION_TYPE.INFO,
            category: NOTIFICATION_CATEGORY.USER,
            actionUrl: '/settings/profile',
            actionLabel: 'Complete Now',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expires in 7 days
          }
        });
      }

      return verified;
    });

    return NextResponse.json({
      success: true,
      message: 'Account verified successfully. You can now log in.',
      userId: updatedUser.id,
      profileCompleted: updatedUser.profileCompleted
    });

  } catch (error: any) {
    console.error('Verification error:', error);

    // Log system error
    await prisma.log.create({
      data: {
        action: ACTIVITY_TYPE.SYSTEM_ERROR,
        targetType: TARGET_TYPE.SYSTEM,
        description: 'Verification error',
        severity: LOG_SEVERITY.ERROR,
        errorMessage: error.message,
        errorStack: error.stack,
        metadata: {
          endpoint: '/api/auth/verify'
        }
      }
    }).catch(() => {});

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

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}