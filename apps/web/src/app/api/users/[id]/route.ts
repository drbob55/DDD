// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BusinessError } from "@dental/database";
import { hash } from "bcryptjs";
import { 
  USER_ROLES,
  SEX_OPTIONS,
  ACTIVITY_TYPE,
  TARGET_TYPE,
  LOG_SEVERITY,
  NOTIFICATION_TYPE,
  NOTIFICATION_CATEGORY,
  BUSINESS_RULES,
  validators
} from "@dental/shared/constants";

// GET: Get single user by ID
export async function GET(
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

    // Users can view their own profile, admins can view any profile
    if (session.user.role !== USER_ROLES.ADMIN && session.user.id !== userId) {
      return NextResponse.json({ 
        success: false,
        error: "Not authorized to view this user" 
      }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        username: true,
        phone: true,
        role: true,
        sex: true,
        dateOfBirth: true,
        isVerified: true,
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
        profileCompleted: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            casesAsPatient: true,
            casesAsDentist: true,
            casesAsReviewer: true,
            appointments: true,
            notifications: true,
            payments: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: "User not found" 
      }, { status: 404 });
    }

    // Log the access if admin is viewing another user
    if (session.user.role === USER_ROLES.ADMIN && session.user.id !== userId) {
      await prisma.log.create({
        data: {
          userId: session.user.id,
          action: ACTIVITY_TYPE.USER_VIEWED,
          targetType: TARGET_TYPE.USER,
          targetId: userId,
          description: `User profile viewed: ${user.name}`,
          severity: LOG_SEVERITY.INFO,
          metadata: {
            viewedUserId: userId,
            viewedUserEmail: user.email,
            viewedUserRole: user.role
          }
        }
      });
    }

    // Add computed fields
    const transformedUser = {
      ...user,
      totalCases: user._count.casesAsPatient + user._count.casesAsDentist + user._count.casesAsReviewer,
      isOnline: user.lastLoginAt && new Date(user.lastLoginAt) > new Date(Date.now() - 15 * 60 * 1000)
    };

    return NextResponse.json({ 
      success: true,
      data: transformedUser 
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ 
      success: false,
      error: "Failed to fetch user" 
    }, { status: 500 });
  }
}

// PUT: Update user
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
    const body = await req.json();

    // Users can update their own profile, admins can update any profile
    if (session.user.role !== USER_ROLES.ADMIN && session.user.id !== userId) {
      return NextResponse.json({ 
        success: false,
        error: "Not authorized to update this user" 
      }, { status: 403 });
    }

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
      isVerified,
      isActive
    } = body;

    // Get current user data for comparison
    const currentUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!currentUser) {
      return NextResponse.json({ 
        success: false,
        error: "User not found" 
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    const changedFields: string[] = [];

    if (firstName !== undefined && firstName !== currentUser.firstName) {
      updateData.firstName = firstName;
      changedFields.push('firstName');
    }
    if (lastName !== undefined && lastName !== currentUser.lastName) {
      updateData.lastName = lastName;
      changedFields.push('lastName');
    }
    if (firstName !== undefined || lastName !== undefined) {
      updateData.name = `${firstName || currentUser.firstName} ${lastName || currentUser.lastName}`;
    }

    // Email update (admin only)
    if (email !== undefined && email !== currentUser.email) {
      if (session.user.role !== USER_ROLES.ADMIN) {
        return NextResponse.json({ 
          success: false,
          error: "Only admins can update email addresses" 
        }, { status: 403 });
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({
          success: false,
          error: "Invalid email format"
        }, { status: 400 });
      }

      // Check email uniqueness
      const emailExists = await prisma.user.findUnique({ 
        where: { email: email.toLowerCase() } 
      });
      if (emailExists) {
        return NextResponse.json({
          success: false,
          error: "Email already in use"
        }, { status: 400 });
      }

      updateData.email = email.toLowerCase();
      updateData.isVerified = false; // Require re-verification
      changedFields.push('email');
    }

    if (phone !== undefined && phone !== currentUser.phone) {
      updateData.phone = phone;
      changedFields.push('phone');
    }

    if (username !== undefined && username !== currentUser.username) {
      // Check username uniqueness
      if (username) {
        const usernameExists = await prisma.user.findUnique({ 
          where: { username } 
        });
        if (usernameExists && usernameExists.id !== userId) {
          return NextResponse.json({
            success: false,
            error: "Username already taken"
          }, { status: 400 });
        }
      }
      updateData.username = username;
      changedFields.push('username');
    }

    // Role update (admin only)
    if (role !== undefined && role !== currentUser.role) {
      if (session.user.role !== USER_ROLES.ADMIN) {
        return NextResponse.json({ 
          success: false,
          error: "Only admins can update user roles" 
        }, { status: 403 });
      }

      if (!validators.isValidUserRole(role)) {
        return NextResponse.json({
          success: false,
          error: "Invalid role provided",
          validValues: Object.values(USER_ROLES)
        }, { status: 400 });
      }
      updateData.role = role;
      changedFields.push('role');
    }

    if (sex !== undefined && sex !== currentUser.sex) {
      if (!validators.isValidSexOption(sex)) {
        return NextResponse.json({
          success: false,
          error: "Invalid sex option provided",
          validValues: Object.values(SEX_OPTIONS)
        }, { status: 400 });
      }
      updateData.sex = sex;
      changedFields.push('sex');
    }

    if (dateOfBirth !== undefined) {
      updateData.dateOfBirth = new Date(dateOfBirth);
      changedFields.push('dateOfBirth');
    }

    // Verification status (admin only)
    if (isVerified !== undefined && isVerified !== currentUser.isVerified) {
      if (session.user.role !== USER_ROLES.ADMIN) {
        return NextResponse.json({ 
          success: false,
          error: "Only admins can update verification status" 
        }, { status: 403 });
      }
      updateData.isVerified = isVerified;
      changedFields.push('isVerified');
    }

    // Active status (admin only)
    if (isActive !== undefined && isActive !== currentUser.isActive) {
      if (session.user.role !== USER_ROLES.ADMIN) {
        return NextResponse.json({ 
          success: false,
          error: "Only admins can update active status" 
        }, { status: 403 });
      }
      updateData.isActive = isActive;
      changedFields.push('isActive');
    }

    // Handle password update
    if (password) {
      if (password.length < BUSINESS_RULES.MIN_PASSWORD_LENGTH) {
        return NextResponse.json({
          success: false,
          error: `Password must be at least ${BUSINESS_RULES.MIN_PASSWORD_LENGTH} characters`
        }, { status: 400 });
      }
      updateData.password = await hash(password, BUSINESS_RULES.BCRYPT_ROUNDS);
      changedFields.push('password');
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        username: true,
        sex: true,
        dateOfBirth: true,
        isVerified: true,
        isActive: true,
        updatedAt: true
      }
    });

    // Create notification for significant changes
    if (changedFields.includes('role') || changedFields.includes('isActive') || changedFields.includes('isVerified')) {
      let notificationMessage = '';
      if (changedFields.includes('role')) {
        notificationMessage = `Your account role has been changed to ${role}`;
      } else if (changedFields.includes('isActive')) {
        notificationMessage = isActive ? 'Your account has been activated' : 'Your account has been deactivated';
      } else if (changedFields.includes('isVerified')) {
        notificationMessage = isVerified ? 'Your account has been verified' : 'Your account verification has been revoked';
      }

      await prisma.notification.create({
        data: {
          userId: userId,
          title: "Account Updated",
          message: notificationMessage,
          type: NOTIFICATION_TYPE.ACCOUNT,
          category: NOTIFICATION_CATEGORY.ACCOUNT,
          priority: "high"
        }
      });
    }

    // Log the update
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: ACTIVITY_TYPE.USER_UPDATED,
        targetType: TARGET_TYPE.USER,
        targetId: userId,
        description: `User updated: ${updatedUser.name}. Changed fields: ${changedFields.join(', ')}`,
        severity: LOG_SEVERITY.INFO,
        metadata: {
          updatedUserId: userId,
          updatedUserEmail: updatedUser.email,
          changedFields,
          updatedBy: session.user.email,
          previousValues: changedFields.reduce((acc, field) => {
            acc[field] = currentUser[field as keyof typeof currentUser];
            return acc;
          }, {} as Record<string, any>)
        }
      }
    });

    return NextResponse.json({ 
      success: true,
      data: updatedUser 
    });
  } catch (error) {
    console.error("Error updating user:", error);
    
    if (error instanceof BusinessError) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: false,
      error: "Failed to update user" 
    }, { status: 500 });
  }
}

// DELETE: Soft delete user (admin only)
export async function DELETE(
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

    // Only admin can delete users
    if (session.user.role !== USER_ROLES.ADMIN) {
      return NextResponse.json({ 
        success: false,
        error: "Not authorized to delete users" 
      }, { status: 403 });
    }

    const userId = params.id;

    // Prevent admin from deleting themselves
    if (session.user.id === userId) {
      return NextResponse.json({ 
        success: false,
        error: "Cannot delete your own account" 
      }, { status: 400 });
    }

    // Get user to check if exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            casesAsPatient: true,
            casesAsDentist: true,
            casesAsReviewer: true,
            appointments: true,
            payments: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: "User not found" 
      }, { status: 404 });
    }

    // Check if user has associated records
    const hasRecords = user._count.casesAsPatient > 0 || 
                      user._count.casesAsDentist > 0 || 
                      user._count.casesAsReviewer > 0 ||
                      user._count.appointments > 0 ||
                      user._count.payments > 0;

    if (hasRecords) {
      // Soft delete - deactivate instead of deleting
      await prisma.user.update({
        where: { id: userId },
        data: { 
          isActive: false,
          deletedAt: new Date()
        }
      });

      // Log the soft delete
      await prisma.log.create({
        data: {
          userId: session.user.id,
          action: ACTIVITY_TYPE.USER_DEACTIVATED,
          targetType: TARGET_TYPE.USER,
          targetId: userId,
          description: `User deactivated (soft delete): ${user.name}`,
          severity: LOG_SEVERITY.WARNING,
          metadata: {
            deletedUserId: userId,
            deletedUserEmail: user.email,
            deletedUserRole: user.role,
            reason: 'Has associated records',
            recordCounts: user._count
          }
        }
      });

      return NextResponse.json({ 
        success: true,
        message: "User deactivated successfully",
        softDelete: true 
      });
    } else {
      // Hard delete - no associated records
      await prisma.user.delete({
        where: { id: userId }
      });

      // Log the hard delete
      await prisma.log.create({
        data: {
          userId: session.user.id,
          action: ACTIVITY_TYPE.USER_DELETED,
          targetType: TARGET_TYPE.USER,
          targetId: userId,
          description: `User permanently deleted: ${user.name}`,
          severity: LOG_SEVERITY.WARNING,
          metadata: {
            deletedUserId: userId,
            deletedUserEmail: user.email,
            deletedUserRole: user.role,
            reason: 'No associated records'
          }
        }
      });

      return NextResponse.json({ 
        success: true,
        message: "User deleted successfully",
        hardDelete: true 
      });
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ 
      success: false,
      error: "Failed to delete user" 
    }, { status: 500 });
  }
}