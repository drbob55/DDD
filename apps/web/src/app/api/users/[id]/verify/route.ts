// src/app/api/users/[id]/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { 
  USER_ROLES,
  ACTIVITY_TYPE,
  TARGET_TYPE,
  LOG_SEVERITY,
  NOTIFICATION_TYPE,
  NOTIFICATION_CATEGORY
} from "@dental/shared/constants";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ 
        success: false,
        error: "Unauthorized" 
      }, { status: 401 });
    }

    // Only admin can manually verify users
    if (session.user.role !== USER_ROLES.ADMIN) {
      return NextResponse.json({ 
        success: false,
        error: "Not authorized to verify users" 
      }, { status: 403 });
    }

    const userId = params.id;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return NextResponse.json({ 
        success: false,
        error: "User not found" 
      }, { status: 404 });
    }

    if (existingUser.isVerified) {
      return NextResponse.json({ 
        success: false,
        error: "User is already verified" 
      }, { status: 400 });
    }

    // Update user to verified
    const user = await prisma.user.update({
      where: { id: userId },
      data: { 
        isVerified: true,
        emailVerified: new Date(),
        emailVerificationCode: null,
        phoneVerificationCode: null,
        // Reset failed login attempts on verification
        failedLoginAttempts: 0,
        lockoutEndTime: null
      },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        isVerified: true,
        emailVerified: true,
        role: true
      }
    });

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "Account Verified",
        message: "Your account has been verified by an administrator. You can now access all features.",
        type: NOTIFICATION_TYPE.ACCOUNT,
        category: NOTIFICATION_CATEGORY.ACCOUNT,
        priority: "high",
        actionUrl: "/dashboard",
        actionLabel: "Go to Dashboard"
      }
    });

    // Log the verification
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: ACTIVITY_TYPE.USER_VERIFIED,
        targetType: TARGET_TYPE.USER,
        targetId: userId,
        description: `User manually verified: ${user.name}`,
        severity: LOG_SEVERITY.INFO,
        metadata: {
          verifiedUserId: user.id,
          verifiedUserEmail: user.email,
          verifiedUserRole: user.role,
          verifiedBy: session.user.email,
          verificationMethod: 'manual'
        }
      }
    });

    return NextResponse.json({ 
      success: true,
      data: user 
    });
  } catch (error) {
    console.error("Error verifying user:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to verify user"
    }, { status: 500 });
  }
}