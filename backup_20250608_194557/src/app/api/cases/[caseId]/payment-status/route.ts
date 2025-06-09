// /api/cases/[caseId]/payment-status/route.ts

import { prisma } from "@/lib/prisma";
import { ROLES, PAYMENT_STATUS } from "@/lib/constants";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";

// GET: Fetch payment status for a specific case
export async function GET(
  req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { caseId } = params;
    
    // Verify the user has access to this case
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        dentistId: true,
        patientId: true,
      }
    });
    
    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    
    // Check user permissions
    const userRole = session.user.role;
    const userId = session.user.id;
    
    const hasAccess = 
      userRole === ROLES.ADMIN ||
      (userRole === ROLES.DENTIST && caseData.dentistId === userId) ||
      (userRole === ROLES.PATIENT && caseData.patientId === userId);
    
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    
    // Get payment for this case
    const payment = await prisma.payment.findFirst({
      where: { caseId },
      orderBy: { createdAt: 'desc' }, // Get the latest payment
      select: {
        id: true,
        status: true,
        amount: true,
        currency: true,
        paymentMethod: true,
        transactionId: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });
    
    return NextResponse.json({ payment });
  } catch (err: any) {
    console.error("Get payment status error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Update payment status for a specific case
export async function PATCH(
  req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== ROLES.ADMIN) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    
    const { caseId } = params;
    const body = await req.json();
    const { paymentId, status, amount, currency, paymentMethod, transactionId, notes } = body;
    
    if (!paymentId || !status) {
      return NextResponse.json({ error: "Missing required fields: paymentId and status" }, { status: 400 });
    }
    
    // Validate payment status
    if (!Object.values(PAYMENT_STATUS).includes(status)) {
      return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
    }
    
    // Verify the payment belongs to this case
    const payment = await prisma.payment.findFirst({
      where: { 
        id: paymentId,
        caseId 
      },
    });
    
    if (!payment) {
      return NextResponse.json({ error: "Payment not found for this case" }, { status: 404 });
    }
    
    // Build update data
    const updateData: any = { status };
    
    // Only update other fields if provided
    if (amount !== undefined) updateData.amount = amount;
    if (currency !== undefined) updateData.currency = currency;
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (transactionId !== undefined) updateData.transactionId = transactionId;
    
    // Update payment
    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: updateData,
    });
    
    // Log the payment status update
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: "PAYMENT_STATUS_UPDATED",
        targetType: "PAYMENT",
        targetId: paymentId,
        details: JSON.stringify({
          caseId,
          oldStatus: payment.status,
          newStatus: status,
          amount: updated.amount,
          currency: updated.currency,
          notes
        })
      }
    });
    
    // Create notification for the case dentist
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      select: {
        caseNumber: true,
        dentistId: true,
        patientId: true,
      }
    });
    
    if (caseData?.dentistId) {
      await prisma.notification.create({
        data: {
          userId: caseData.dentistId,
          message: `Payment status updated for case #${caseData.caseNumber}: ${status}`,
          type: "PAYMENT_UPDATE"
        }
      });
    }
    
    return NextResponse.json({ 
      success: true,
      payment: updated 
    });
  } catch (err: any) {
    console.error("Payment status update error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Create a new payment for a case
export async function POST(
  req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== ROLES.ADMIN) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    
    const { caseId } = params;
    const body = await req.json();
    const { userId, amount, currency, status, paymentMethod, transactionId, description } = body;
    
    // Validate required fields
    if (!userId || !amount || !currency || !status) {
      return NextResponse.json({ 
        error: "Missing required fields: userId, amount, currency, and status" 
      }, { status: 400 });
    }
    
    // Verify the case exists
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        caseNumber: true,
        dentistId: true,
        patientId: true,
        patient: {
          select: {
            name: true,
          }
        }
      }
    });
    
    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    
    // Check if payment already exists for this case
    const existingPayment = await prisma.payment.findFirst({
      where: { caseId }
    });
    
    if (existingPayment) {
      return NextResponse.json({ 
        error: "Payment already exists for this case. Use PATCH to update it." 
      }, { status: 400 });
    }
    
    // Create the payment
    const payment = await prisma.payment.create({
      data: {
        userId,
        caseId,
        amount: amount.toString(),
        currency,
        status,
        paymentMethod: paymentMethod || "CREDIT_CARD",
        transactionId: transactionId || null,
        description: description || `Payment for case #${caseData.caseNumber}`,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });
    
    // Log the payment creation
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: "PAYMENT_CREATED",
        targetType: "PAYMENT",
        targetId: payment.id,
        details: JSON.stringify({
          caseId,
          caseNumber: caseData.caseNumber,
          amount,
          currency,
          status
        })
      }
    });
    
    // Create notifications
    if (caseData.dentistId) {
      await prisma.notification.create({
        data: {
          userId: caseData.dentistId,
          message: `Payment created for case #${caseData.caseNumber}: ${currency} ${amount}`,
          type: "PAYMENT_CREATED"
        }
      });
    }
    
    if (caseData.patientId && caseData.patientId !== userId) {
      await prisma.notification.create({
        data: {
          userId: caseData.patientId,
          message: `A payment has been recorded for your case #${caseData.caseNumber}`,
          type: "PAYMENT_CREATED"
        }
      });
    }
    
    return NextResponse.json({ 
      success: true,
      payment 
    });
  } catch (err: any) {
    console.error("Payment creation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}