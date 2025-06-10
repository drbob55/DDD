import { prisma } from "@/lib/prisma";
import { ROLES } from '@dental/shared';
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// GET: Fetch single payment
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
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
    
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }
    
    // Check access
    if (session.user.role !== ROLES.ADMIN && payment.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    return NextResponse.json({ payment });
  } catch (err: any) {
    console.error("Payment fetch error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE (optional, admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== ROLES.ADMIN) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    
    await prisma.payment.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Payment delete error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}