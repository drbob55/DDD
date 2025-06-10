// app/api/cases/[caseId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@dental/core/infrastructure/prisma/client';
import { 
  USER_ROLES,
  CASE_STATUS,
  ACTIVITY_TYPE,
  TARGET_TYPE,
  LOG_SEVERITY,
  validators,
  CASE_STATUS_TRANSITIONS,
  DISPLAY_NAMES
} from '@dental/shared/constants';
import { BusinessError } from '@dental/core/domain/errors/business.error';

// Helper to check case access based on role
function checkCaseAccess(caseData: any, user: any): boolean {
  if (!validators.isValidUserRole(user.role)) {
    return false;
  }

  switch (user.role) {
    case USER_ROLES.ADMIN:
      return true;
      
    case USER_ROLES.DENTIST:
      return caseData.dentistId === user.id;
      
    case USER_ROLES.PATIENT:
      return caseData.patientId === user.id;
      
    case USER_ROLES.REVIEWER:
      return caseData.reviewerId === user.id || 
             [CASE_STATUS.PENDING_REVIEW, CASE_STATUS.IN_REVIEW].includes(caseData.status);
             
    case USER_ROLES.MANUFACTURER:
      return caseData.manufacturerId === user.id ||
             [
               CASE_STATUS.IN_PRODUCTION, 
               CASE_STATUS.MANUFACTURING,
               CASE_STATUS.READY_TO_SHIP,
               CASE_STATUS.SHIPPED
             ].includes(caseData.status);
             
    default:
      return false;
  }
}

// Helper to check update permissions
function checkUpdatePermission(caseData: any, user: any, updateType: string): boolean {
  if (!validators.isValidUserRole(user.role)) {
    return false;
  }

  switch (user.role) {
    case USER_ROLES.ADMIN:
      return true;
      
    case USER_ROLES.DENTIST:
      // Dentists can update their own cases
      return caseData.dentistId === user.id;
      
    case USER_ROLES.REVIEWER:
      // Reviewers can update status for cases they're reviewing
      return updateType === 'status' && 
             (caseData.reviewerId === user.id ||
              [CASE_STATUS.PENDING_REVIEW, CASE_STATUS.IN_REVIEW].includes(caseData.status));
              
    case USER_ROLES.MANUFACTURER:
      // Manufacturers can update production status
      return updateType === 'status' &&
             caseData.manufacturerId === user.id &&
             [
               CASE_STATUS.IN_PRODUCTION,
               CASE_STATUS.MANUFACTURING,
               CASE_STATUS.READY_TO_SHIP
             ].includes(caseData.status);
             
    default:
      return false;
  }
}

// GET - Get single case with complete data
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await the params
    const { caseId } = await params;

    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            sex: true,
            dateOfBirth: true,
            profileCompleted: true,
            createdAt: true,
            updatedAt: true,
          }
        },
        dentist: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        manufacturer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        clinic: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
          }
        },
        appointments: {
          orderBy: { scheduledAt: 'desc' },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              }
            }
          }
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                role: true
              }
            }
          }
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          where: {
            // Show internal notes only to dentists and admins
            OR: [
              { isInternal: false },
              { 
                isInternal: true,
                user: {
                  role: {
                    in: session.user.role === USER_ROLES.DENTIST || session.user.role === USER_ROLES.ADMIN
                      ? [USER_ROLES.DENTIST, USER_ROLES.ADMIN]
                      : ['NONE'] // This will match nothing
                  }
                }
              }
            ]
          },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                role: true
              }
            }
          }
        },
        files: {
          where: { deletedAt: null },
          orderBy: { uploadedAt: 'desc' },
          include: {
            uploadedBy: {
              select: {
                firstName: true,
                lastName: true,
                role: true
              }
            }
          }
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            amount: true,
            currency: true,
            method: true,
            description: true,
            transactionId: true,
            processedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        _count: {
          select: {
            files: true,
            notes: true,
            activities: true,
            appointments: true,
            payments: true
          }
        }
      },
    });

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Check if user has access to this case
    if (!checkCaseAccess(caseData, session.user)) {
      console.log(`Access denied - Role: ${session.user.role}, CaseId: ${caseId}, UserId: ${session.user.id}`);
      
      // Log unauthorized access attempt
      await prisma.log.create({
        data: {
          userId: session.user.id,
          action: ACTIVITY_TYPE.CASE_VIEWED,
          targetType: TARGET_TYPE.CASE,
          targetId: caseId,
          description: 'Unauthorized case access attempt',
          severity: LOG_SEVERITY.WARNING,
          metadata: {
            userRole: session.user.role,
            caseStatus: caseData.status
          }
        }
      }).catch(() => {});
      
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Log successful access
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: ACTIVITY_TYPE.CASE_VIEWED,
        targetType: TARGET_TYPE.CASE,
        targetId: caseId,
        description: `Case ${caseData.caseNumber} viewed`,
        severity: LOG_SEVERITY.INFO,
        metadata: {
          caseNumber: caseData.caseNumber,
          caseStatus: caseData.status
        }
      }
    }).catch(() => {});

    // Format response with display names
    const formattedCase = {
      ...caseData,
      payment: caseData.payments?.[0] || null,
      statusDisplay: DISPLAY_NAMES.caseStatus[caseData.status as keyof typeof DISPLAY_NAMES.caseStatus] || caseData.status,
      priorityDisplay: caseData.priority ? DISPLAY_NAMES.priority[caseData.priority as keyof typeof DISPLAY_NAMES.priority] : null,
      // Add available status transitions for UI
      availableTransitions: session.user.role === USER_ROLES.ADMIN || session.user.role === USER_ROLES.DENTIST
        ? CASE_STATUS_TRANSITIONS[caseData.status as keyof typeof CASE_STATUS_TRANSITIONS] || []
        : [],
    };

    return NextResponse.json(formattedCase);
  } catch (error: any) {
    console.error('Error fetching case:', error);
    
    // Log error
    await prisma.log.create({
      data: {
        userId: session?.user?.id,
        action: ACTIVITY_TYPE.SYSTEM_ERROR,
        targetType: TARGET_TYPE.SYSTEM,
        description: 'Error fetching case details',
        severity: LOG_SEVERITY.ERROR,
        errorMessage: error.message,
        errorStack: error.stack,
        metadata: { endpoint: '/api/cases/[caseId] GET' }
      }
    }).catch(() => {});
    
    return NextResponse.json(
      { error: 'Failed to fetch case' },
      { status: 500 }
    );
  }
}

// PATCH - Update case
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await the params
    const { caseId } = await params;
    const body = await req.json();
    const { archivedByDentist, archived, status, notes, priority, reviewerId, manufacturerId } = body;

    // Get existing case
    const existingCase = await prisma.case.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        caseNumber: true,
        dentistId: true,
        patientId: true,
        archivedByDentist: true,
        status: true,
        priority: true,
        reviewerId: true,
        manufacturerId: true,
      }
    });

    if (!existingCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Determine update type
    const updateType = status ? 'status' : 'general';
    
    // Check permissions
    if (!checkUpdatePermission(existingCase, session.user, updateType)) {
      await prisma.log.create({
        data: {
          userId: session.user.id,
          action: ACTIVITY_TYPE.CASE_UPDATED,
          targetType: TARGET_TYPE.CASE,
          targetId: caseId,
          description: 'Unauthorized case update attempt',
          severity: LOG_SEVERITY.WARNING,
          metadata: {
            attemptedChanges: body,
            userRole: session.user.role
          }
        }
      }).catch(() => {});
      
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build update data
    const updateData: any = {};
    const activityDetails: string[] = [];
    
    // Handle archive/restore
    if (archivedByDentist !== undefined || archived !== undefined) {
      const newArchiveStatus = archivedByDentist ?? archived;
      updateData.archivedByDentist = newArchiveStatus;
      updateData.archivedAt = newArchiveStatus ? new Date() : null;
      activityDetails.push(`Case ${newArchiveStatus ? 'archived' : 'restored'}`);
    }
    
    // Handle status change with validation
    if (status !== undefined) {
      // Validate status
      if (!validators.isValidCaseStatus(status)) {
        return NextResponse.json({ 
          error: 'Invalid case status',
          validStatuses: Object.values(CASE_STATUS)
        }, { status: 400 });
      }
      
      // Check status transition
      const validTransitions = CASE_STATUS_TRANSITIONS[existingCase.status as keyof typeof CASE_STATUS_TRANSITIONS] || [];
      if (!validTransitions.includes(status)) {
        return NextResponse.json({ 
          error: `Invalid status transition from ${existingCase.status} to ${status}`,
          currentStatus: existingCase.status,
          validTransitions: validTransitions
        }, { status: 400 });
      }
      
      updateData.status = status;
      activityDetails.push(`Status changed from ${existingCase.status} to ${status}`);
      
      // Set status-specific timestamps
      switch (status) {
        case CASE_STATUS.IN_REVIEW:
          updateData.reviewStartedAt = new Date();
          break;
        case CASE_STATUS.APPROVED:
          updateData.approvedAt = new Date();
          updateData.reviewCompletedAt = new Date();
          break;
        case CASE_STATUS.REJECTED:
          updateData.rejectedAt = new Date();
          updateData.reviewCompletedAt = new Date();
          break;
        case CASE_STATUS.IN_PRODUCTION:
          updateData.manufacturingStartedAt = new Date();
          break;
        case CASE_STATUS.SHIPPED:
          updateData.shippedAt = new Date();
          break;
        case CASE_STATUS.DELIVERED:
          updateData.deliveredAt = new Date();
          break;
        case CASE_STATUS.COMPLETED:
          updateData.completedAt = new Date();
          break;
      }
    }
    
    // Handle priority change
    if (priority !== undefined) {
      if (!validators.isValidCasePriority(priority)) {
        return NextResponse.json({ 
          error: 'Invalid case priority',
          validPriorities: Object.values(CASE_PRIORITY)
        }, { status: 400 });
      }
      updateData.priority = priority;
      updateData.isUrgent = priority === CASE_PRIORITY.URGENT;
      activityDetails.push(`Priority changed to ${priority}`);
    }
    
    // Handle reviewer assignment
    if (reviewerId !== undefined && session.user.role === USER_ROLES.ADMIN) {
      updateData.reviewerId = reviewerId;
      activityDetails.push(`Reviewer ${reviewerId ? 'assigned' : 'removed'}`);
    }
    
    // Handle manufacturer assignment
    if (manufacturerId !== undefined && session.user.role === USER_ROLES.ADMIN) {
      updateData.manufacturerId = manufacturerId;
      activityDetails.push(`Manufacturer ${manufacturerId ? 'assigned' : 'removed'}`);
    }
    
    // Handle notes update
    if (notes !== undefined) {
      updateData.notes = notes;
      activityDetails.push('Notes updated');
    }

    updateData.updatedAt = new Date();

    // Update the case
    const updatedCase = await prisma.$transaction(async (tx) => {
      // Update case
      const updated = await tx.case.update({
        where: { id: caseId },
        data: updateData,
        include: {
          patient: true,
          dentist: true,
          reviewer: true,
          manufacturer: true,
          appointments: {
            orderBy: { scheduledAt: 'desc' },
            take: 5
          },
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 20
          },
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              files: true,
              notes: true,
              activities: true
            }
          }
        },
      });

      // Log activity
      if (activityDetails.length > 0) {
        await tx.caseActivity.create({
          data: {
            caseId: caseId,
            userId: session.user.id,
            action: status ? ACTIVITY_TYPE.CASE_STATUS_CHANGED : ACTIVITY_TYPE.CASE_UPDATED,
            details: activityDetails.join(', '),
            metadata: {
              changes: body,
              updatedBy: {
                id: session.user.id,
                role: session.user.role,
                name: `${session.user.firstName} ${session.user.lastName}`
              }
            }
          }
        });
      }

      // Log the update
      await tx.log.create({
        data: {
          userId: session.user.id,
          action: ACTIVITY_TYPE.CASE_UPDATED,
          targetType: TARGET_TYPE.CASE,
          targetId: caseId,
          description: `Case ${existingCase.caseNumber} updated: ${activityDetails.join(', ')}`,
          severity: LOG_SEVERITY.INFO,
          metadata: {
            caseNumber: existingCase.caseNumber,
            changes: body,
            previousValues: {
              status: existingCase.status,
              priority: existingCase.priority,
              archivedByDentist: existingCase.archivedByDentist
            }
          }
        }
      });

      // Create notifications for status changes
      if (status && status !== existingCase.status) {
        const notifications = [];
        
        // Notify patient
        notifications.push({
          userId: existingCase.patientId,
          title: 'Case Status Updated',
          message: `Your case ${existingCase.caseNumber} status has been updated to ${DISPLAY_NAMES.caseStatus[status as keyof typeof DISPLAY_NAMES.caseStatus]}`,
          type: NOTIFICATION_TYPE.CASE_UPDATE,
          category: NOTIFICATION_CATEGORY.CASE,
          relatedEntityId: caseId,
          relatedEntityType: TARGET_TYPE.CASE,
          actionUrl: `/cases/${caseId}`,
          actionLabel: 'View Case'
        });
        
        // Notify dentist if someone else made the change
        if (session.user.id !== existingCase.dentistId) {
          notifications.push({
            userId: existingCase.dentistId,
            title: 'Case Status Updated',
            message: `Case ${existingCase.caseNumber} status changed to ${DISPLAY_NAMES.caseStatus[status as keyof typeof DISPLAY_NAMES.caseStatus]}`,
            type: NOTIFICATION_TYPE.CASE_UPDATE,
            category: NOTIFICATION_CATEGORY.CASE,
            relatedEntityId: caseId,
            relatedEntityType: TARGET_TYPE.CASE,
            actionUrl: `/cases/${caseId}`,
            actionLabel: 'View Case'
          });
        }
        
        await tx.notification.createMany({ data: notifications });
      }

      return updated;
    });

    // Format response
    const formattedCase = {
      ...updatedCase,
      payment: updatedCase.payments?.[0] || null,
      statusDisplay: DISPLAY_NAMES.caseStatus[updatedCase.status as keyof typeof DISPLAY_NAMES.caseStatus] || updatedCase.status,
      priorityDisplay: updatedCase.priority ? DISPLAY_NAMES.priority[updatedCase.priority as keyof typeof DISPLAY_NAMES.priority] : null,
    };

    return NextResponse.json({
      success: true,
      case: formattedCase,
      message: activityDetails.join(', ')
    });
  } catch (error: any) {
    console.error('Error updating case:', error);
    
    // Log error
    await prisma.log.create({
      data: {
        userId: session?.user?.id,
        action: ACTIVITY_TYPE.SYSTEM_ERROR,
        targetType: TARGET_TYPE.SYSTEM,
        description: 'Error updating case',
        severity: LOG_SEVERITY.ERROR,
        errorMessage: error.message,
        errorStack: error.stack,
        metadata: { 
          endpoint: '/api/cases/[caseId] PATCH',
          caseId: params.caseId,
          requestBody: body
        }
      }
    }).catch(() => {});

    if (error instanceof BusinessError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error.name === 'ValidationError') {
      return NextResponse.json({ 
        error: error.message,
        field: error.field,
        validValues: error.validValues
      }, { status: 400 });
    }
    
    return NextResponse.json(
      { error: 'Failed to update case', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete case (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can permanently delete cases
    if (session.user.role !== USER_ROLES.ADMIN) {
      await prisma.log.create({
        data: {
          userId: session.user.id,
          action: ACTIVITY_TYPE.CASE_DELETED,
          targetType: TARGET_TYPE.CASE,
          targetId: (await params).caseId,
          description: 'Unauthorized case deletion attempt',
          severity: LOG_SEVERITY.WARNING,
          metadata: { userRole: session.user.role }
        }
      }).catch(() => {});
      
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    // Await the params
    const { caseId } = await params;

    // Check if case exists
    const existingCase = await prisma.case.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        caseNumber: true,
        status: true,
        patientId: true,
        dentistId: true
      }
    });

    if (!existingCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Don't allow deletion of active cases
    const activeStatuses = [
      CASE_STATUS.IN_PRODUCTION,
      CASE_STATUS.MANUFACTURING,
      CASE_STATUS.SHIPPED
    ];
    
    if (activeStatuses.includes(existingCase.status)) {
      return NextResponse.json({ 
        error: `Cannot delete case in ${existingCase.status} status. Archive it instead.` 
      }, { status: 400 });
    }

    // Soft delete by archiving instead of hard delete
    await prisma.$transaction(async (tx) => {
      // Archive the case
      await tx.case.update({
        where: { id: caseId },
        data: {
          archivedByDentist: true,
          archivedAt: new Date(),
          hiddenByDentist: true,
          notes: `${existingCase.notes || ''}\n\n[DELETED by admin ${session.user.email} on ${new Date().toISOString()}]`
        }
      });

      // Log the deletion
      await tx.log.create({
        data: {
          userId: session.user.id,
          action: ACTIVITY_TYPE.CASE_DELETED,
          targetType: TARGET_TYPE.CASE,
          targetId: caseId,
          description: `Case ${existingCase.caseNumber} deleted (archived) by admin`,
          severity: LOG_SEVERITY.WARNING,
          metadata: {
            caseNumber: existingCase.caseNumber,
            caseStatus: existingCase.status,
            reason: 'Admin deletion'
          }
        }
      });

      // Create activity
      await tx.caseActivity.create({
        data: {
          caseId: caseId,
          userId: session.user.id,
          action: ACTIVITY_TYPE.CASE_DELETED,
          details: `Case deleted (archived) by admin ${session.user.email}`,
          metadata: {
            deletedBy: {
              id: session.user.id,
              email: session.user.email,
              role: session.user.role
            }
          }
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Case archived successfully'
    });
  } catch (error: any) {
    console.error('Error deleting case:', error);
    
    await prisma.log.create({
      data: {
        userId: session?.user?.id,
        action: ACTIVITY_TYPE.SYSTEM_ERROR,
        targetType: TARGET_TYPE.SYSTEM,
        description: 'Error deleting case',
        severity: LOG_SEVERITY.ERROR,
        errorMessage: error.message,
        errorStack: error.stack,
        metadata: { endpoint: '/api/cases/[caseId] DELETE' }
      }
    }).catch(() => {});
    
    return NextResponse.json(
      { error: 'Failed to delete case' },
      { status: 500 }
    );
  }
}