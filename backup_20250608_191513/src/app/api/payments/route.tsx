import { prisma } from "@/lib/prisma";
import { ROLES, CASE_STATUS, PAYMENT_STATUS, SEX_OPTIONS } from "@/lib/constants";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../apps/web/src/app/api/auth/[...nextauth]/route";

// GET: Fetch payments
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    let where: any = {};
    
    // Non-admins can only see their own payments
    if (session.user.role !== ROLES.ADMIN) {
      where.userId = session.user.id;
    }
    
    const payments = await prisma.payment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        case: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    
    return NextResponse.json({ payments });
  } catch (err: any) {
    console.error("Payments fetch error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Create payment (Admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== ROLES.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { userId, caseId, amount, currency, description } = await req.json();
    
    // Validate required fields
    if (!userId || !caseId || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    // Verify user and case exist
    const [user, caseRecord] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.case.findUnique({ where: { id: caseId } }),
    ]);
    
    if (!user || !caseRecord) {
      return NextResponse.json({ error: "Invalid user or case ID" }, { status: 400 });
    }
    
    const payment = await prisma.payment.create({
      data: {
        userId,
        caseId,
        amount: parseFloat(amount),
        currency: currency || "USD",
        description,
        status: PAYMENT_STATUS.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        case: {
          select: {
            id: true,
          },
        },
      },
    });
    
    // Create notification for user
    await prisma.notification.create({
      data: {
        userId,
        message: `New payment of ${currency || "USD"} ${amount} created for case ${caseId}`,
      },
    });
    
    // Log the action
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: "PAYMENT_CREATED",
        targetType: "PAYMENT",
        targetId: payment.id,
        details: `Payment of ${amount} ${currency} created for user ${user.name}`,
      },
    });
    
    return NextResponse.json({ payment });
  } catch (err: any) {
    console.error("Payment creation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}