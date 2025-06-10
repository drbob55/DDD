// src/app/api/cases/[caseId]/reassign-reviewer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from '@dental/core/infrastructure/prisma/client';
import { 
  USER_ROLES,
  CASE_STATUS,
  ACTIVITY_TYPE,
  TARGET_TYPE,
  LOG_SEVERITY,
  NOTIFICATION_TYPE,
  NOTIFICATION_CATEGORY,
  validators,
  CASE_STATUS_TRANSITIONS
} from '@dental/shared/constants';
import { BusinessError } from '@dental/core/domain/errors/business.error';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can reassign reviewers
    if (session.user.role !== USER_ROLES.ADMIN) {
      await prisma.log.create({
        data: {
          userId: session.user.id,
          action: ACTIVITY_TYPE.CASE_REASSIGNED,
          targetType: TARGET_TYPE.CASE,
          description: 'Unauthorized reviewer reassignment attempt',
          severity: LOG_SEVERITY.WARNING,
          metadata: { userRole: session.user.role }
        }
      }).catch(() => {});

      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    
    const { caseId } = await params;
    const { reviewerId } = await req.json();
    
    if (!reviewerId) {
      return NextResponse.json({ error: "Missing reviewerId" }, { status: 400 });
    }
    
    // Get current case data
    const currentCase = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!currentCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Verify new reviewer exists and has correct role
    const newReviewer = await prisma.user.findUnique({
      where: { id: reviewerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true
      }
    });

    if (!newReviewer) {
      return NextResponse.json({ error: "Reviewer not found" }, { status: 404 });
    }

    if (newReviewer.role !== USER_ROLES.REVIEWER) {
      return NextResponse.json({ 
        error: "Selected user is not a reviewer",
        userRole: newReviewer.role,
        requiredRole: USER_ROLES.REVIEWER
      }, { status: 400 });
    }

    if (!newReviewer.isActive) {
      return NextResponse.json({ error: "Selected reviewer is not active" }, { status: 400 });
    }

    // Check if case is in appropriate status for reviewer assignment
    const reviewableStatuses = [
      CASE_STATUS.PENDING_REVIEW,
      CASE_STATUS.IN_REVIEW,
      CASE_STATUS.AWAITING_CONSENT
    ];

    if (!reviewableStatuses.includes(currentCase.status)) {
      return NextResponse.json({ 
        error: `Cannot assign reviewer to case in ${currentCase.status} status`,
        currentStatus: currentCase.status,
        allowedStatuses: reviewableStatuses
      }, { status: 400 });
    }

    // Update case with transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Update case
      const updatedCase = await tx.case.update({
        where: { id: caseId },
        data: { 
          reviewerId,
          // If case is pending review, move to in review
          ...(currentCase.status === CASE_STATUS.PENDING_REVIEW && {
            status: CASE_STATUS.IN_REVIEW,
            reviewStartedAt: new Date()
          })
        },
      });

      // Log the activity
      await tx.log.create({
        data: {
          userId: session.user.id,
          action: ACTIVITY_TYPE.CASE_REASSIGNED,
          targetType: TARGET_TYPE.CASE,
          targetId: caseId,
          description: `Reviewer reassigned for case ${currentCase.caseNumber}`,
          severity: LOG_SEVERITY.INFO,
          metadata: {
            caseNumber: currentCase.caseNumber,
            oldReviewerId: currentCase.reviewerId,
            oldReviewerName: currentCase.reviewer ? 
              `${currentCase.reviewer.firstName} ${currentCase.reviewer.lastName}` : null,
            newReviewerId: reviewerId,
            newReviewerName: `${newReviewer.firstName} ${newReviewer.lastName}`,
            statusChanged: currentCase.status !== updatedCase.status
          }
        }
      });

      // Create case activity
      await tx.caseActivity.create({
        data: {
          caseId: caseId,
          userId: session.user.id,
          action: ACTIVITY_TYPE.CASE_REASSIGNED,
          details: `Reviewer changed to ${newReviewer.firstName} ${newReviewer.lastName}`,
          metadata: {
            oldReviewerId: currentCase.reviewerId,
            newReviewerId: reviewerId,
            statusChanged: currentCase.status !== updatedCase.status
          }
        }
      });

      // Create notifications
      const notifications = [];

      // Notify new reviewer
      notifications.push({
        userId: reviewerId,
        title: 'New Case Assignment',
        message: `You have been assigned to review case ${currentCase.caseNumber} for patient ${currentCase.patient.firstName} ${currentCase.patient.lastName}`,
        type: NOTIFICATION_TYPE.CASE_UPDATE,
        category: NOTIFICATION_CATEGORY.CASE,
        relatedEntityId: caseId,
        relatedEntityType: TARGET_TYPE.CASE,
        actionUrl: `/cases/${caseId}`,
        actionLabel: 'Review Case'
      });

      // Notify old reviewer if exists
      if (currentCase.reviewerId && currentCase.reviewerId !== reviewerId) {
        notifications.push({
          userId: currentCase.reviewerId,
          title: 'Case Reassigned',
          message: `Case ${currentCase.caseNumber} has been reassigned to another reviewer`,
          type: NOTIFICATION_TYPE.INFO,
          category: NOTIFICATION_CATEGORY.CASE,
          relatedEntityId: caseId,
          relatedEntityType: TARGET_TYPE.CASE
        });
      }

      await tx.notification.createMany({ data: notifications });

      return updatedCase;
    });
    
    return NextResponse.json({ 
      success: true,
      case: updated,
      message: `Reviewer successfully assigned to ${newReviewer.firstName} ${newReviewer.lastName}`
    });

  } catch (err: any) {
    console.error("Reassign reviewer error:", err);
    
    await prisma.log.create({
      data: {
        userId: session?.user?.id,
        action: ACTIVITY_TYPE.SYSTEM_ERROR,
        targetType: TARGET_TYPE.SYSTEM,
        description: 'Error reassigning reviewer',
        severity: LOG_SEVERITY.ERROR,
        errorMessage: err.message,
        errorStack: err.stack,
        metadata: { endpoint: '/api/cases/[caseId]/reassign-reviewer' }
      }
    }).catch(() => {});

    if (err instanceof BusinessError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ============================================
// src/app/api/cases/[caseId]/reassign-dentist/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from '@dental/core/infrastructure/prisma/client';
import { 
  USER_ROLES,
  ACTIVITY_TYPE,
  TARGET_TYPE,
  LOG_SEVERITY,
  NOTIFICATION_TYPE,
  NOTIFICATION_CATEGORY,
  validators
} from '@dental/shared/constants';
import { BusinessError } from '@dental/core/domain/errors/business.error';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can reassign dentists
    if (session.user.role !== USER_ROLES.ADMIN) {
      await prisma.log.create({
        data: {
          userId: session.user.id,
          action: ACTIVITY_TYPE.CASE_REASSIGNED,
          targetType: TARGET_TYPE.CASE,
          description: 'Unauthorized dentist reassignment attempt',
          severity: LOG_SEVERITY.WARNING,
          metadata: { userRole: session.user.role }
        }
      }).catch(() => {});

      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    
    const { caseId } = await params;
    const { dentistId } = await req.json();
    
    if (!dentistId) {
      return NextResponse.json({ error: "Dentist ID is required" }, { status: 400 });
    }
    
    // Verify dentist exists and has correct role
    const dentist = await prisma.user.findUnique({
      where: { id: dentistId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true
      }
    });
    
    if (!dentist) {
      return NextResponse.json({ error: "Dentist not found" }, { status: 404 });
    }

    if (dentist.role !== USER_ROLES.DENTIST) {
      return NextResponse.json({ 
        error: "Selected user is not a dentist",
        userRole: dentist.role,
        requiredRole: USER_ROLES.DENTIST
      }, { status: 400 });
    }

    if (!dentist.isActive) {
      return NextResponse.json({ error: "Selected dentist is not active" }, { status: 400 });
    }
    
    // Get the case to notify old dentist
    const oldCase = await prisma.case.findUnique({
      where: { id: caseId },
      include: { 
        dentist: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
    
    if (!oldCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Check if dentist is actually changing
    if (oldCase.dentistId === dentistId) {
      return NextResponse.json({ 
        error: "New dentist is the same as current dentist" 
      }, { status: 400 });
    }
    
    // Update the case with transaction
    const updatedCase = await prisma.$transaction(async (tx) => {
      // Update case
      const updated = await tx.case.update({
        where: { id: caseId },
        data: { dentistId },
      });

      // Log the change
      await tx.log.create({
        data: {
          userId: session.user.id,
          action: ACTIVITY_TYPE.CASE_REASSIGNED,
          targetType: TARGET_TYPE.CASE,
          targetId: caseId,
          description: `Dentist reassigned for case ${oldCase.caseNumber}`,
          severity: LOG_SEVERITY.INFO,
          metadata: {
            caseNumber: oldCase.caseNumber,
            oldDentistId: oldCase.dentistId,
            oldDentistName: oldCase.dentist ? 
              `${oldCase.dentist.firstName} ${oldCase.dentist.lastName}` : null,
            newDentistId: dentistId,
            newDentistName: `${dentist.firstName} ${dentist.lastName}`,
            patientName: `${oldCase.patient.firstName} ${oldCase.patient.lastName}`
          }
        }
      });

      // Create case activity
      await tx.caseActivity.create({
        data: {
          caseId: caseId,
          userId: session.user.id,
          action: ACTIVITY_TYPE.CASE_REASSIGNED,
          details: `Dentist changed to Dr. ${dentist.firstName} ${dentist.lastName}`,
          metadata: {
            oldDentistId: oldCase.dentistId,
            newDentistId: dentistId
          }
        }
      });

      // Create notifications
      const notifications = [];

      // Notify new dentist
      notifications.push({
        userId: dentistId,
        title: 'New Case Assignment',
        message: `You have been assigned to case ${oldCase.caseNumber} for patient ${oldCase.patient.firstName} ${oldCase.patient.lastName}`,
        type: NOTIFICATION_TYPE.CASE_UPDATE,
        category: NOTIFICATION_CATEGORY.CASE,
        relatedEntityId: caseId,
        relatedEntityType: TARGET_TYPE.CASE,
        actionUrl: `/cases/${caseId}`,
        actionLabel: 'View Case'
      });
      
      // Notify old dentist if exists
      if (oldCase.dentistId && oldCase.dentistId !== dentistId) {
        notifications.push({
          userId: oldCase.dentistId,
          title: 'Case Reassigned',
          message: `Case ${oldCase.caseNumber} has been reassigned to another dentist`,
          type: NOTIFICATION_TYPE.INFO,
          category: NOTIFICATION_CATEGORY.CASE,
          relatedEntityId: caseId,
          relatedEntityType: TARGET_TYPE.CASE
        });
      }

      // Notify patient
      notifications.push({
        userId: oldCase.patient.id,
        title: 'Dentist Changed',
        message: `Your dentist for case ${oldCase.caseNumber} has been changed to Dr. ${dentist.firstName} ${dentist.lastName}`,
        type: NOTIFICATION_TYPE.INFO,
        category: NOTIFICATION_CATEGORY.CASE,
        relatedEntityId: caseId,
        relatedEntityType: TARGET_TYPE.CASE,
        actionUrl: `/cases/${caseId}`,
        actionLabel: 'View Case'
      });

      await tx.notification.createMany({ data: notifications });

      return updated;
    });
    
    return NextResponse.json({ 
      success: true,
      case: updatedCase,
      message: `Dentist successfully changed to Dr. ${dentist.firstName} ${dentist.lastName}`
    });

  } catch (err: any) {
    console.error("Reassign dentist error:", err);
    
    await prisma.log.create({
      data: {
        userId: session?.user?.id,
        action: ACTIVITY_TYPE.SYSTEM_ERROR,
        targetType: TARGET_TYPE.SYSTEM,
        description: 'Error reassigning dentist',
        severity: LOG_SEVERITY.ERROR,
        errorMessage: err.message,
        errorStack: err.stack,
        metadata: { endpoint: '/api/cases/[caseId]/reassign-dentist' }
      }
    }).catch(() => {});

    if (err instanceof BusinessError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ============================================
// src/app/api/cases/[caseId]/reassign-manufacturer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from '@dental/core/infrastructure/prisma/client';
import { 
  USER_ROLES,
  CASE_STATUS,
  ACTIVITY_TYPE,
  TARGET_TYPE,
  LOG_SEVERITY,
  NOTIFICATION_TYPE,
  NOTIFICATION_CATEGORY,
  validators
} from '@dental/shared/constants';
import { BusinessError } from '@dental/core/domain/errors/business.error';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can assign manufacturers
    if (session.user.role !== USER_ROLES.ADMIN) {
      await prisma.log.create({
        data: {
          userId: session.user.id,
          action: ACTIVITY_TYPE.CASE_REASSIGNED,
          targetType: TARGET_TYPE.CASE,
          description: 'Unauthorized manufacturer assignment attempt',
          severity: LOG_SEVERITY.WARNING,
          metadata: { userRole: session.user.role }
        }
      }).catch(() => {});

      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    
    const { caseId } = await params;
    const { manufacturerId } = await req.json();
    
    if (!manufacturerId) {
      return NextResponse.json({ error: "Manufacturer ID is required" }, { status: 400 });
    }
    
    // Get current case data
    const currentCase = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        manufacturer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!currentCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Check if case is in appropriate status for manufacturer assignment
    const manufacturableStatuses = [
      CASE_STATUS.APPROVED,
      CASE_STATUS.IN_PRODUCTION,
      CASE_STATUS.MANUFACTURING,
      CASE_STATUS.READY_TO_SHIP
    ];

    if (!manufacturableStatuses.includes(currentCase.status)) {
      return NextResponse.json({ 
        error: `Cannot assign manufacturer to case in ${currentCase.status} status`,
        currentStatus: currentCase.status,
        allowedStatuses: manufacturableStatuses
      }, { status: 400 });
    }

    // Verify manufacturer exists and has correct role
    const manufacturer = await prisma.user.findUnique({
      where: { id: manufacturerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true
      }
    });

    if (!manufacturer) {
      return NextResponse.json({ error: "Manufacturer not found" }, { status: 404 });
    }

    if (manufacturer.role !== USER_ROLES.MANUFACTURER) {
      return NextResponse.json({ 
        error: "Selected user is not a manufacturer",
        userRole: manufacturer.role,
        requiredRole: USER_ROLES.MANUFACTURER
      }, { status: 400 });
    }

    if (!manufacturer.isActive) {
      return NextResponse.json({ error: "Selected manufacturer is not active" }, { status: 400 });
    }

    // Update case with transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Update case
      const updatedCase = await tx.case.update({
        where: { id: caseId },
        data: { 
          manufacturerId,
          // If case is approved, move to in production
          ...(currentCase.status === CASE_STATUS.APPROVED && {
            status: CASE_STATUS.IN_PRODUCTION,
            manufacturingStartedAt: new Date()
          })
        },
      });

      // Log the activity
      await tx.log.create({
        data: {
          userId: session.user.id,
          action: ACTIVITY_TYPE.CASE_REASSIGNED,
          targetType: TARGET_TYPE.CASE,
          targetId: caseId,
          description: `Manufacturer assigned for case ${currentCase.caseNumber}`,
          severity: LOG_SEVERITY.INFO,
          metadata: {
            caseNumber: currentCase.caseNumber,
            oldManufacturerId: currentCase.manufacturerId,
            oldManufacturerName: currentCase.manufacturer ? 
              `${currentCase.manufacturer.firstName} ${currentCase.manufacturer.lastName}` : null,
            newManufacturerId: manufacturerId,
            newManufacturerName: `${manufacturer.firstName} ${manufacturer.lastName}`,
            statusChanged: currentCase.status !== updatedCase.status
          }
        }
      });

      // Create case activity
      await tx.caseActivity.create({
        data: {
          caseId: caseId,
          userId: session.user.id,
          action: ACTIVITY_TYPE.CASE_REASSIGNED,
          details: `Manufacturer ${currentCase.manufacturerId ? 'changed' : 'assigned'} to ${manufacturer.firstName} ${manufacturer.lastName}`,
          metadata: {
            oldManufacturerId: currentCase.manufacturerId,
            newManufacturerId: manufacturerId,
            statusChanged: currentCase.status !== updatedCase.status
          }
        }
      });

      // Create notifications
      const notifications = [];

      // Notify new manufacturer
      notifications.push({
        userId: manufacturerId,
        title: 'New Manufacturing Assignment',
        message: `You have been assigned to manufacture case ${currentCase.caseNumber}`,
        type: NOTIFICATION_TYPE.CASE_UPDATE,
        category: NOTIFICATION_CATEGORY.CASE,
        relatedEntityId: caseId,
        relatedEntityType: TARGET_TYPE.CASE,
        actionUrl: `/cases/${caseId}`,
        actionLabel: 'View Case'
      });

      // Notify old manufacturer if exists
      if (currentCase.manufacturerId && currentCase.manufacturerId !== manufacturerId) {
        notifications.push({
          userId: currentCase.manufacturerId,
          title: 'Case Reassigned',
          message: `Case ${currentCase.caseNumber} has been reassigned to another manufacturer`,
          type: NOTIFICATION_TYPE.INFO,
          category: NOTIFICATION_CATEGORY.CASE,
          relatedEntityId: caseId,
          relatedEntityType: TARGET_TYPE.CASE
        });
      }

      await tx.notification.createMany({ data: notifications });

      return updatedCase;
    });
    
    return NextResponse.json({ 
      success: true,
      case: updated,
      message: `Manufacturer successfully assigned to ${manufacturer.firstName} ${manufacturer.lastName}`
    });

  } catch (err: any) {
    console.error("Assign manufacturer error:", err);
    
    await prisma.log.create({
      data: {
        userId: session?.user?.id,
        action: ACTIVITY_TYPE.SYSTEM_ERROR,
        targetType: TARGET_TYPE.SYSTEM,
        description: 'Error assigning manufacturer',
        severity: LOG_SEVERITY.ERROR,
        errorMessage: err.message,
        errorStack: err.stack,
        metadata: { endpoint: '/api/cases/[caseId]/reassign-manufacturer' }
      }
    }).catch(() => {});

    if (err instanceof BusinessError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}