import { prisma } from "@/lib/prisma";
import { ROLES, CASE_STATUS, PAYMENT_STATUS, SEX_OPTIONS } from "@/lib/constants";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../../apps/web/src/app/api/auth/[...nextauth]/route";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== ROLES.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { status } = await req.json();
    const paymentId = params.id;
    
    const validStatuses = [
      PAYMENT_STATUS.PENDING, 
      PAYMENT_STATUS.PAID, 
      PAYMENT_STATUS.FAILED, 
      PAYMENT_STATUS.REFUNDED, 
      PAYMENT_STATUS.CANCELLED
    ];
    
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true },
    });
    
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }
    
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: { status },
    });
    
    // Create notification for user
    const statusMessages: Record<string, string> = {
      [PAYMENT_STATUS.PAID]: "Your payment has been confirmed",
      [PAYMENT_STATUS.REFUNDED]: "Your payment has been refunded",
      [PAYMENT_STATUS.CANCELLED]: "Your payment has been cancelled",
      [PAYMENT_STATUS.FAILED]: "Your payment has failed",
    };
    
    if (statusMessages[status]) {
      await prisma.notification.create({
        data: {
          userId: payment.userId,
          message: `${statusMessages[status]} for case ${payment.caseId}`,
        },
      });
    }
    
    // Log the action
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: `PAYMENT_${status}`,
        targetType: "PAYMENT",
        targetId: paymentId,
        details: `Payment status changed to ${status}`,
      },
    });
    
    return NextResponse.json({ success: true, payment: updatedPayment });
  } catch (err: any) {
    console.error("Payment status update error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}