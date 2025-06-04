import { prisma } from "@/lib/prisma";
import { ROLES, CASE_STATUS, PAYMENT_STATUS, SEX_OPTIONS } from "@/lib/constants";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";

export async function POST(
  req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== ROLES.PATIENT) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const caseId = params.caseId;
    const { consent } = await req.json();
    
    if (typeof consent !== "boolean") {
      return NextResponse.json({ error: "Invalid consent value" }, { status: 400 });
    }
    
    // Get the case
    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        dentist: true,
      },
    });
    
    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    
    // Verify the case belongs to this patient
    if (caseRecord.patientId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized - not your case" }, { status: 401 });
    }
    
    // Check if case is in correct status
    if (caseRecord.status !== CASE_STATUS.AWAITING_CONSENT) {
      return NextResponse.json({ 
        error: "Case is not awaiting consent" 
      }, { status: 400 });
    }
    
    // Update case status
    const updatedCase = await prisma.case.update({
      where: { id: caseId },
      data: {
        status: consent ? CASE_STATUS.IN_TREATMENT : CASE_STATUS.REJECTED,
        // You might want to add a consentDate field to your schema
      },
    });
    
    // Create notifications
    if (consent) {
      // Notify dentist
      await prisma.notification.create({
        data: {
          userId: caseRecord.dentistId,
          message: `Patient has provided consent for case ${caseId}. Treatment can begin.`,
        },
      });
      
      // Notify reviewer if assigned
      if (caseRecord.reviewerId) {
        await prisma.notification.create({
          data: {
            userId: caseRecord.reviewerId,
            message: `Patient consent received for case ${caseId}`,
          },
        });
      }
    } else {
      // Patient rejected consent
      await prisma.notification.create({
        data: {
          userId: caseRecord.dentistId,
          message: `Patient has declined consent for case ${caseId}`,
        },
      });
    }
    
    // Log the action
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: consent ? "CONSENT_PROVIDED" : "CONSENT_REJECTED",
        targetType: "CASE",
        targetId: caseId,
        details: `Patient ${consent ? "provided" : "rejected"} consent for case ${caseId}`,
      },
    });
    
    return NextResponse.json({
      success: true,
      case: updatedCase,
      message: consent 
        ? "Consent provided successfully" 
        : "Treatment declined",
    });
  } catch (err: any) {
    console.error("Consent error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}