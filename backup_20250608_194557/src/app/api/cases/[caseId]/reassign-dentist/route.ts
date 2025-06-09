// src/app/api/cases/[caseId]/reassign-dentist/route.ts
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/constants";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== ROLES.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { dentistId } = await req.json();
    const caseId = params.caseId;
    
    if (!dentistId) {
      return NextResponse.json({ error: "Dentist ID is required" }, { status: 400 });
    }
    
    // Verify dentist exists and has correct role
    const dentist = await prisma.user.findUnique({
      where: { id: dentistId },
    });
    
    if (!dentist || dentist.role !== ROLES.DENTIST) {
      return NextResponse.json({ error: "Invalid dentist ID" }, { status: 400 });
    }
    
    // Get the case to notify old dentist
    const oldCase = await prisma.case.findUnique({
      where: { id: caseId },
      include: { dentist: true, patient: true }
    });
    
    if (!oldCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    
    // Update the case
    const updatedCase = await prisma.case.update({
      where: { id: caseId },
      data: { dentistId },
    });
    
    // Create notifications
    // Notify new dentist
    await prisma.notification.create({
      data: {
        userId: dentistId,
        message: `You have been assigned to case ${oldCase.caseNumber} for patient ${oldCase.patient.name}`,
        type: "CASE_ASSIGNED"
      },
    });
    
    // Notify old dentist if exists
    if (oldCase.dentistId && oldCase.dentistId !== dentistId) {
      await prisma.notification.create({
        data: {
          userId: oldCase.dentistId,
          message: `Case ${oldCase.caseNumber} has been reassigned to another dentist`,
          type: "CASE_REASSIGNED"
        },
      });
    }
    
    // Log the action
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: "ADMIN_REASSIGN_DENTIST",
        targetType: "CASE",
        targetId: caseId,
        details: JSON.stringify({
          oldDentistId: oldCase.dentistId,
          oldDentistName: oldCase.dentist?.name,
          newDentistId: dentistId,
          newDentistName: dentist.name,
          caseNumber: oldCase.caseNumber
        }),
      },
    });
    
    return NextResponse.json({ success: true, case: updatedCase });
  } catch (err: any) {
    console.error("Reassign dentist error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}