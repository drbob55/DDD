// src/app/api/users/[id]/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { 
  USER_ROLES,
  ACTIVITY_TYPE,
  TARGET_TYPE,
  LOG_SEVERITY,
  NOTIFICATION_TYPE,
  NOTIFICATION_CATEGORY,
  BUSINESS_RULES
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

    const userId = params.id;
    const { password, currentPassword } = await req.json();

    // Check if user is updating their own password or admin is resetting
    const isOwnAccount = session.user.id === userId;
    const isAdmin = session.user.role === USER_ROLES.ADMIN;

    if (!isOwnAccount && !isAdmin) {
      return NextResponse.json({ 
        success: false,
        error: "Not authorized to reset this password" 
      }, { status: 403 });
    }

    // Validate new password
    if (!password || password.length < BUSINESS_RULES.MIN_PASSWORD_LENGTH) {
      return NextResponse.json({
        success: false,
        error: `Password must be at least ${BUSINESS_RULES.MIN_PASSWORD_LENGTH} characters`
      }, { status: 400 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: "User not found" 
      }, { status: 404 });
    }

    // If user is changing their own password, verify current password
    if (isOwnAccount && !isAdmin) {
      if (!currentPassword) {
        return NextResponse.json({ 
          success: false,
          error: "Current password is required" 
        }, { status: 400 });
      }

      const bcrypt = require('bcryptjs');
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      
      if (!isValidPassword) {
        // Log failed attempt
        await prisma.log.create({
          data: {
            userId: session.user.id,
            action: ACTIVITY_TYPE.PASSWORD_CHANGE_FAILED,
            targetType: TARGET_TYPE.USER,
            targetId: userId,
            description: "Failed password change attempt - incorrect current password",
            severity: LOG_SEVERITY.WARNING,
            metadata: {
              reason: 'Invalid current password'
            }
          }
        });

        return NextResponse.json({ 
          success: false,
          error: "Current password is incorrect" 
        }, { status: 400 });
      }
    }

    // Hash new password
    const hashedPassword = await hash(password, BUSINESS_RULES.BCRYPT_ROUNDS);

    // Update password and reset security fields
    await prisma.user.update({
      where: { id: userId },
      data: { 
        password: hashedPassword,
        passwordResetCode: null,
        passwordResetExpires: null,
        // Reset failed login attempts on password change
        failedLoginAttempts: 0,
        lockoutEndTime: null,
        lastPasswordChangeAt: new Date()
      }
    });

    // Create notification
    const notificationMessage = isOwnAccount 
      ? "Your password has been successfully changed."
      : "Your password has been reset by an administrator. Please log in with your new password.";

    await prisma.notification.create({
      data: {
        userId: userId,
        title: "Password Updated",
        message: notificationMessage,
        type: NOTIFICATION_TYPE.SECURITY,
        category: NOTIFICATION_CATEGORY.ACCOUNT,
        priority: "high",
        ...(isOwnAccount ? {} : {
          actionUrl: "/login",
          actionLabel: "Login Now"
        })
      }
    });

    // Log the password change
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: isOwnAccount ? ACTIVITY_TYPE.PASSWORD_CHANGED : ACTIVITY_TYPE.PASSWORD_RESET,
        targetType: TARGET_TYPE.USER,
        targetId: userId,
        description: isOwnAccount 
          ? "User changed their own password"
          : `Admin reset password for user: ${user.name}`,
        severity: LOG_SEVERITY.INFO,
        metadata: {
          targetUserId: userId,
          targetUserEmail: user.email,
          resetBy: session.user.email,
          resetMethod: isOwnAccount ? 'self-service' : 'admin-reset'
        }
      }
    });

    // If admin reset, also log security event
    if (!isOwnAccount && isAdmin) {
      await prisma.log.create({
        data: {
          userId: userId,
          action: ACTIVITY_TYPE.SECURITY_EVENT,
          targetType: TARGET_TYPE.USER,
          targetId: userId,
          description: "Password was reset by administrator",
          severity: LOG_SEVERITY.WARNING,
          metadata: {
            adminId: session.user.id,
            adminEmail: session.user.email,
            reason: 'Admin password reset'
          }
        }
      });
    }

    return NextResponse.json({ 
      success: true,
      message: isOwnAccount 
        ? "Password changed successfully" 
        : "Password reset successfully"
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json({ 
      success: false,
      error: "Failed to reset password" 
    }, { status: 500 });
  }
}