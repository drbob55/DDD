// src/app/api/payments/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@dental/database";
import { BusinessError } from "@dental/database";
import { 
  USER_ROLES, 
  PAYMENT_STATUS,
  PAYMENT_STATUS_TRANSITIONS,
  ACTIVITY_TYPE,
  TARGET_TYPE,
  LOG_SEVERITY,
  NOTIFICATION_TYPE,
  NOTIFICATION_CATEGORY,
  validators
} from "@dental/shared/constants";

export async function PATCH(
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
    
    // Only admin can update payment status
    if (session.user.role !== USER_ROLES.ADMIN) {
      return NextResponse.json({ 
        success: false,
        error: "Not authorized to update payment status" 
      }, { status: 403 });
    }
    
    const body = await req.json();
    const { status, reason, transactionId, processedAt } = body;
    const paymentId = params.id;
    
    // Validate payment status using constants
    if (!status || !validators.isValidPaymentStatus(status)) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid payment status",
        validValues: Object.values(PAYMENT_STATUS)
      }, { status: 400 });
    }
    
    // Get current payment
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { 
        user: true,
        case: {
          include: {
            patient: true
          }
        }
      }
    });
    
    if (!payment) {
      return NextResponse.json({ 
        success: false,
        error: "Payment not found" 
      }, { status: 404 });
    }
    
    // Validate status transition using constants
    const allowedTransitions = PAYMENT_STATUS_TRANSITIONS[payment.status as keyof typeof PAYMENT_STATUS_TRANSITIONS];
    if (!allowedTransitions || !allowedTransitions.includes(status)) {
      return NextResponse.json({ 
        success: false,
        error: `Invalid status transition from ${payment.status} to ${status}`,
        validTransitions: allowedTransitions || []
      }, { status: 400 });
    }
    
    // Build update data based on status
    const updateData: any = {
      status,
      updatedAt: new Date()
    };
    
    // Add status-specific fields
    switch (status) {
      case PAYMENT_STATUS.PAID:
        updateData.paidAt = processedAt ? new Date(processedAt) : new Date();
        updateData.transactionId = transactionId;
        break;
      case PAYMENT_STATUS.REFUNDED:
        updateData.refundedAt = processedAt ? new Date(processedAt) : new Date();
        updateData.refundReason = reason;
        updateData.refundTransactionId = transactionId;
        break;
      case PAYMENT_STATUS.CANCELLED:
        updateData.cancelledAt = new Date();
        updateData.cancelReason = reason || `Cancelled by ${session.user.name || 'admin'}`;
        break;
      case PAYMENT_STATUS.FAILED:
        updateData.failedAt = new Date();
        updateData.failureReason = reason || "Payment processing failed";
        break;
    }
    
    // Update payment
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: updateData,
      include: {
        user: true,
        case: {
          include: {
            patient: true
          }
        }
      }
    });
    
    // Create notification for user using constants
    const statusMessages: Record<string, string> = {
      [PAYMENT_STATUS.PAID]: "Your payment has been successfully processed",
      [PAYMENT_STATUS.REFUNDED]: "Your payment has been refunded",
      [PAYMENT_STATUS.CANCELLED]: "Your payment has been cancelled",
      [PAYMENT_STATUS.FAILED]: "Your payment could not be processed"
    };
    
    const notificationPriority: Record<string, string> = {
      [PAYMENT_STATUS.PAID]: "high",
      [PAYMENT_STATUS.REFUNDED]: "high",
      [PAYMENT_STATUS.CANCELLED]: "medium",
      [PAYMENT_STATUS.FAILED]: "high"
    };
    
    if (statusMessages[status]) {
      await prisma.notification.create({
        data: {
          userId: payment.userId,
          title: `Payment ${status}`,
          message: `${statusMessages[status]} for case ${payment.case.caseNumber}. Amount: ${payment.currency} ${payment.amount}`,
          type: NOTIFICATION_TYPE.PAYMENT,
          category: NOTIFICATION_CATEGORY.BILLING,
          priority: notificationPriority[status] || "medium",
          actionUrl: `/payments/${paymentId}`,
          actionLabel: "View Details",
          metadata: {
            paymentId,
            previousStatus: payment.status,
            newStatus: status,
            amount: payment.amount,
            currency: payment.currency,
            reason
          }
        }
      });
    }
    
    // Log the action using constants
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: ACTIVITY_TYPE.PAYMENT_STATUS_CHANGED,
        targetType: TARGET_TYPE.PAYMENT,
        targetId: paymentId,
        description: `Payment status changed from ${payment.status} to ${status}`,
        severity: status === PAYMENT_STATUS.FAILED ? LOG_SEVERITY.WARNING : LOG_SEVERITY.INFO,
        metadata: {
          previousStatus: payment.status,
          newStatus: status,
          amount: payment.amount,
          currency: payment.currency,
          transactionId,
          reason,
          userName: payment.user.name,
          caseNumber: payment.case.caseNumber
        }
      }
    });
    
    // Create case activity
    await prisma.caseActivity.create({
      data: {
        caseId: payment.caseId,
        userId: session.user.id,
        userName: session.user.name || `${session.user.firstName} ${session.user.lastName}`,
        action: ACTIVITY_TYPE.PAYMENT_STATUS_CHANGED,
        details: `Payment ${payment.currency} ${payment.amount} marked as ${status}`,
        metadata: {
          paymentId,
          previousStatus: payment.status,
          newStatus: status,
          transactionId,
          reason
        }
      }
    });
    
    // If payment is marked as PAID, update case if needed
    if (status === PAYMENT_STATUS.PAID && payment.case) {
      // You might want to check if all payments are complete and update case status
      const allPayments = await prisma.payment.findMany({
        where: { caseId: payment.caseId }
      });
      
      const allPaid = allPayments.every(p => 
        p.id === paymentId ? status === PAYMENT_STATUS.PAID : p.status === PAYMENT_STATUS.PAID
      );
      
      if (allPaid) {
        // Log that all payments are complete
        await prisma.log.create({
          data: {
            userId: session.user.id,
            action: ACTIVITY_TYPE.CASE_PAYMENTS_COMPLETED,
            targetType: TARGET_TYPE.CASE,
            targetId: payment.caseId,
            description: `All payments completed for case ${payment.case.caseNumber}`,
            severity: LOG_SEVERITY.INFO,
            metadata: {
              totalPayments: allPayments.length,
              totalAmount: allPayments.reduce((sum, p) => sum + p.amount, 0),
              currency: payment.currency
            }
          }
        });
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      data: updatedPayment 
    });
  } catch (error) {
    console.error("Payment status update error:", error);
    
    if (error instanceof BusinessError) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: false,
      error: "Failed to update payment status" 
    }, { status: 500 });
  }
}