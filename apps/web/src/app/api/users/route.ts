// src/app/api/users/route.ts
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

// GET: List all users (admin only)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ 
        success: false,
        error: "Unauthorized" 
      }, { status: 401 });
    }

    // Only admin can list all users
    if (session.user.role !== USER_ROLES.ADMIN) {
      return NextResponse.json({ 
        success: false,
        error: "Not authorized to list users" 
      }, { status: 403 });
    }

    const url = new URL(req.url);
    const role = url.searchParams.get("role");
    const isActive = url.searchParams.get("isActive");
    const isVerified = url.searchParams.get("isVerified");
    const search = url.searchParams.get("search");

    // Validate role if provided
    if (role && !validators.isValidUserRole(role)) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid role filter",
        validValues: Object.values(USER_ROLES)
      }, { status: 400 });
    }

    let where: any = {};
    if (role) where.role = role;
    if (isActive !== null) where.isActive = isActive === 'true';
    if (isVerified !== null) where.isVerified = isVerified === 'true';
    
    // Search by name, email, or phone
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { username: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const users = await prisma.user.findMany({
      where,
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
        lastLoginAt: true,
        profileCompleted: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            casesAsPatient: true,
            casesAsDentist: true,
            casesAsReviewer: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Log the access
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: ACTIVITY_TYPE.USER_LIST_VIEWED,
        targetType: TARGET_TYPE.USER,
        description: `User list accessed with filters: ${JSON.stringify({ role, isActive, isVerified, search })}`,
        severity: LOG_SEVERITY.INFO,
        metadata: {
          filters: { role, isActive, isVerified, search },
          resultCount: users.length
        }
      }
    });

    // Transform users to include computed fields
    const transformedUsers = users.map(user => ({
      ...user,
      caseCount: user._count.casesAsPatient + user._count.casesAsDentist + user._count.casesAsReviewer,
      isOnline: user.lastLoginAt && new Date(user.lastLoginAt) > new Date(Date.now() - 15 * 60 * 1000) // Active in last 15 mins
    }));
    
    return NextResponse.json({ 
      success: true,
      data: transformedUsers,
      summary: {
        total: users.length,
        byRole: Object.values(USER_ROLES).reduce((acc, role) => {
          acc[role] = users.filter(u => u.role === role).length;
          return acc;
        }, {} as Record<string, number>),
        verified: users.filter(u => u.isVerified).length,
        unverified: users.filter(u => !u.isVerified).length,
        active: users.filter(u => u.isActive).length,
        inactive: users.filter(u => !u.isActive).length
      }
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ 
      success: false,
      error: "Failed to fetch users" 
    }, { status: 500 });
  }
}

// POST: Create new user (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ 
        success: false,
        error: "Unauthorized" 
      }, { status: 401 });
    }

    // Only admin can create users directly
    if (session.user.role !== USER_ROLES.ADMIN) {
      return NextResponse.json({ 
        success: false,
        error: "Not authorized to create users" 
      }, { status: 403 });
    }

    const body = await req.json();
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
      sendWelcomeEmail = true
    } = body;
    
    // Validate required fields
    if (!firstName || !lastName || !email || !password || !role) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: firstName, lastName, email, password, and role are required"
      }, { status: 400 });
    }
    
    // Validate password using business rules
    if (password.length < BUSINESS_RULES.MIN_PASSWORD_LENGTH) {
      return NextResponse.json({
        success: false,
        error: `Password must be at least ${BUSINESS_RULES.MIN_PASSWORD_LENGTH} characters`
      }, { status: 400 });
    }
    
    // Validate role using constants
    if (!validators.isValidUserRole(role)) {
      return NextResponse.json({
        success: false,
        error: "Invalid role provided",
        validValues: Object.values(USER_ROLES)
      }, { status: 400 });
    }
    
    // Validate sex if provided
    if (sex && !validators.isValidSexOption(sex)) {
      return NextResponse.json({
        success: false,
        error: "Invalid sex option provided",
        validValues: Object.values(SEX_OPTIONS)
      }, { status: 400 });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        error: "Invalid email format"
      }, { status: 400 });
    }
    
    // Ensure email is unique
    const exists = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase() } 
    });
    if (exists) {
      return NextResponse.json({
        success: false,
        error: "Email already registered"
      }, { status: 400 });
    }

    // Check username uniqueness if provided
    if (username) {
      const usernameExists = await prisma.user.findUnique({ 
        where: { username } 
      });
      if (usernameExists) {
        return NextResponse.json({
          success: false,
          error: "Username already taken"
        }, { status: 400 });
      }
    }
    
    // Hash password
    const hashedPassword = await hash(password, BUSINESS_RULES.BCRYPT_ROUNDS);
    
    // Generate unique IDs
    const generateUniqueId = async () => {
      let id;
      do {
        id = Math.floor(10000000 + Math.random() * 90000000).toString();
      } while (await prisma.user.findUnique({ where: { id } }));
      return id;
    };

    const [uniqueId, uniqueUserId] = await Promise.all([
      generateUniqueId(),
      generateUniqueId()
    ]);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        id: uniqueId,
        userId: uniqueUserId,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        email: email.toLowerCase(),
        password: hashedPassword,
        phone: phone || null,
        role,
        username: username || null,
        sex: sex || SEX_OPTIONS.PREFER_NOT_TO_SAY,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        isVerified: true, // Admin-created users are auto-verified
        isActive: true,
        profileCompleted: true
      },
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
        createdAt: true
      }
    });

    // Create welcome notification
    if (sendWelcomeEmail) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: "Welcome to Dental Platform",
          message: `Welcome ${user.firstName}! Your account has been created with the role: ${role}. You can now log in with your email and password.`,
          type: NOTIFICATION_TYPE.SYSTEM,
          category: NOTIFICATION_CATEGORY.ACCOUNT,
          priority: "medium",
          actionUrl: "/login",
          actionLabel: "Login Now"
        }
      });
    }

    // Log the user creation
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: ACTIVITY_TYPE.USER_CREATED,
        targetType: TARGET_TYPE.USER,
        targetId: user.id,
        description: `New ${role} user created: ${user.name}`,
        severity: LOG_SEVERITY.INFO,
        metadata: {
          createdUserId: user.id,
          createdUserEmail: user.email,
          createdUserRole: role,
          createdByAdmin: session.user.email
        }
      }
    });
    
    return NextResponse.json({ 
      success: true,
      data: user 
    });
  } catch (error) {
    console.error("Error creating user:", error);
    
    if (error instanceof BusinessError) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: false,
      error: "Failed to create user" 
    }, { status: 500 });
  }
}