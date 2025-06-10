// src/app/api/cases/[caseId]/status/route.ts
import { prisma } from "@/lib/prisma";
import { ROLES, CASE_STATUS, ACTIVITY_TYPE, TARGET_TYPE } from '@dental/shared';
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface RouteParams {
  params: {
    caseId: string;
  };
}

// Named export for PUT method
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    console.log("Status update API called");
    console.log("Case ID from params:", params.caseId);
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const { status } = body;
    
    console.log("Update request:", { 
      caseId: params.caseId, 
      status, 
      userId: session.user.id,
      userRole: session.user.role 
    });
    
    if (!status) {
      return NextResponse.json({ error: "Missing status" }, { status: 400 });
    }
    
    // Get the case to check permissions
    const existingCase = await prisma.case.findUnique({
      where: { id: params.caseId },
      include: { 
        dentist: true,
        patient: true 
      }
    });
    
    if (!existingCase) {
      console.log("Case not found:", params.caseId);
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    
    console.log("Existing case status:", existingCase.status);
    console.log("Dentist ID:", existingCase.dentistId);
    console.log("Session user ID:", session.user.id);
    
    // Permission logic
    let hasPermission = false;
    
    if (session.user.role === ROLES.ADMIN) {
      // Admin can update any status
      console.log("Admin user - permission granted");
      hasPermission = true;
    } else if (
      session.user.role === ROLES.DENTIST && 
      session.user.id === existingCase.dentistId
    ) {
      // Dentist can only toggle between IN_TREATMENT and COMPLETED for their own cases
      const isAllowedTransition = (
        (existingCase.status === CASE_STATUS.IN_TREATMENT && status === CASE_STATUS.COMPLETED) ||
        (existingCase.status === CASE_STATUS.COMPLETED && status === CASE_STATUS.IN_TREATMENT) ||
        // Allow dentist to move from AWAITING_CONSENT to IN_TREATMENT
        (existingCase.status === CASE_STATUS.AWAITING_CONSENT && status === CASE_STATUS.IN_TREATMENT)
      );
      
      if (isAllowedTransition) {
        console.log("Dentist user - allowed status transition");
        hasPermission = true;
      } else {
        console.log("Dentist user - transition not allowed:", existingCase.status, "->", status);
      }
    } else if (session.user.role === ROLES.REVIEWER) {
      // Reviewer can approve or reject cases in PENDING_REVIEW status
      const isAllowedTransition = (
        (existingCase.status === CASE_STATUS.PENDING_REVIEW && status === CASE_STATUS.AWAITING_CONSENT) ||
        (existingCase.status === CASE_STATUS.PENDING_REVIEW && status === CASE_STATUS.REJECTED)
      );
      
      if (isAllowedTransition) {
        console.log("Reviewer user - allowed status transition");
        hasPermission = true;
      }
    }
    
    if (!hasPermission) {
      return NextResponse.json({ 
        error: "You don't have permission to update this case status",
        details: {
          userRole: session.user.role,
          currentStatus: existingCase.status,
          requestedStatus: status
        }
      }, { status: 403 });
    }
    
    // Validate status value
    const validStatuses = Object.values(CASE_STATUS);
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: "Invalid status",
        validStatuses 
      }, { status: 400 });
    }
    
    // Update the case
    const updated = await prisma.case.update({
      where: { id: params.caseId },
      data: { 
        status,
        updatedAt: new Date()
      },
      include: {
        patient: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        dentist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      }
    });
    
    console.log("Case updated successfully:", updated.id);
    
    // Log the status change
    try {
      await prisma.log.create({
        data: {
          userId: session.user.id,
          action: ACTIVITY_TYPE.STATUS_CHANGED,
          targetType: TARGET_TYPE.CASE,
          targetId: params.caseId,
          details: JSON.stringify({
            from: existingCase.status,
            to: status,
            caseNumber: existingCase.caseNumber,
            patientName: existingCase.patient.name,
            updatedBy: session.user.role
          })
        }
      });
    } catch (logError) {
      console.error("Error creating log:", logError);
      // Don't fail the request if logging fails
    }
    
    // Create case activity
    try {
      await prisma.caseActivity.create({
        data: {
          caseId: params.caseId,
          userId: session.user.id,
          userName: session.user.name || `${session.user.firstName} ${session.user.lastName}`,
          action: ACTIVITY_TYPE.STATUS_CHANGED,
          details: `Status changed from ${existingCase.status} to ${status}`,
        },
      });
    } catch (activityError) {
      console.error("Error creating case activity:", activityError);
    }
    
    // Create notification for patient
    if (existingCase.patient.id && existingCase.patient.id !== session.user.id) {
      try {
        await prisma.notification.create({
          data: {
            userId: existingCase.patient.id,
            message: `Your case ${existingCase.caseNumber} has been ${
              status === CASE_STATUS.COMPLETED ? 'completed' : `updated to ${status}`
            }`,
            type: "info"
          }
        });
      } catch (notifError) {
        console.error("Error creating notification:", notifError);
        // Don't fail the request if notification fails
      }
    }
    
    return NextResponse.json({ 
      success: true,
      case: updated,
      message: `Case status updated to ${status}`
    });
  } catch (err: any) {
    console.error("Case status update error:", err);
    return NextResponse.json({ 
      error: err.message || "Internal server error",
      details: err.toString()
    }, { status: 500 });
  }
}

// Also support PATCH method for compatibility
export async function PATCH(
  request: NextRequest,
  context: RouteParams
) {
  return PUT(request, context);
}

// Add OPTIONS for CORS if needed
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}