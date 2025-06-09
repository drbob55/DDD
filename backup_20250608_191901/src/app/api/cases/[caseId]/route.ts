// app/api/cases/[caseId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Fixed import path
import { prisma } from '@/lib/prisma';

// GET - Get single case with complete data
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> } // Fixed: params is a Promise
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
            userId: true,
            firstName: true,
            lastName: true,
            name: true,
            email: true,
            phone: true,
            sex: true,
            dateOfBirth: true,
            createdAt: true,
            updatedAt: true,
          }
        },
        dentist: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        manufacturer: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        appointments: {
          orderBy: { date: 'desc' }
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        caseNotes: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                name: true,
                role: true
              }
            }
          }
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            amount: true,
            currency: true,
            description: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Check if user has access to this case
    const hasAccess = 
      session.user.role === 'ADMIN' ||
      (session.user.role === 'DENTIST' && caseData.dentistId === session.user.id) ||
      (session.user.role === 'PATIENT' && caseData.patientId === session.user.id) ||
      (session.user.role === 'REVIEWER' && (caseData.reviewerId === session.user.id || caseData.status === 'PENDING_REVIEW')) ||
      (session.user.role === 'MANUFACTURER' && caseData.manufacturerId === session.user.id);

    if (!hasAccess) {
      console.log(`Access denied - Role: ${session.user.role}, CaseId: ${caseId}, UserId: ${session.user.id}`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse scanFileUrl if it exists
    let parsedScanFiles = {};
    if (caseData.scanFileUrl) {
      try {
        parsedScanFiles = JSON.parse(caseData.scanFileUrl);
      } catch (e) {
        console.error('Error parsing scanFileUrl:', e);
      }
    }

    // Format response to match the cases list endpoint structure
    const formattedCase = {
      ...caseData,
      payment: caseData.payments?.[0] || null,
      parsedScanFiles, // Add parsed files for easier access
    };

    return NextResponse.json(formattedCase);
  } catch (error) {
    console.error('Error fetching case:', error);
    return NextResponse.json(
      { error: 'Failed to fetch case' },
      { status: 500 }
    );
  }
}

// PATCH - Update case (including archive/restore)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> } // Fixed: params is a Promise
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await the params
    const { caseId } = await params;

    const body = await req.json();
    const { archivedByDentist, archived, status, notes } = body;

    // First, check if the case exists and user has access
    const existingCase = await prisma.case.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        dentistId: true,
        archivedByDentist: true,
        status: true,
      }
    });

    if (!existingCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Check permissions based on role
    let hasPermission = false;
    
    if (session.user.role === 'ADMIN') {
      hasPermission = true;
    } else if (session.user.role === 'DENTIST') {
      hasPermission = existingCase.dentistId === session.user.id;
    } else if (session.user.role === 'REVIEWER' && status) {
      // Reviewers can update status for cases under review
      hasPermission = existingCase.status === 'PENDING_REVIEW';
    }

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build update data
    const updateData: any = {};
    
    // Handle both archived and archivedByDentist for compatibility
    if (archivedByDentist !== undefined) {
      updateData.archivedByDentist = archivedByDentist;
      updateData.archivedAt = archivedByDentist ? new Date() : null;
    } else if (archived !== undefined) {
      updateData.archivedByDentist = archived;
      updateData.archivedAt = archived ? new Date() : null;
    }
    
    if (status !== undefined) {
      updateData.status = status;
      
      // Set status-specific timestamps
      if (status === 'AWAITING_CONSENT') {
        updateData.reviewedAt = new Date();
        updateData.reviewerId = session.user.id;
      } else if (status === 'IN_TREATMENT') {
        updateData.treatmentStartedAt = new Date();
      } else if (status === 'MANUFACTURING') {
        updateData.manufacturingStartedAt = new Date();
      } else if (status === 'SHIPPED') {
        updateData.shippedAt = new Date();
      } else if (status === 'COMPLETED') {
        updateData.treatmentCompletedAt = new Date();
      }
    }
    
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    updateData.updatedAt = new Date();

    // Update the case
    const updatedCase = await prisma.case.update({
      where: { id: caseId },
      data: updateData,
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
            sex: true,
            dateOfBirth: true,
            createdAt: true,
            updatedAt: true,
          }
        },
        dentist: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        manufacturer: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        appointments: {
          orderBy: { date: 'desc' }
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // Log the activity
    if (status !== undefined && existingCase.status !== status) {
      await prisma.caseActivity.create({
        data: {
          caseId: caseId,
          userId: session.user.id,
          userName: session.user.name || `${session.user.firstName} ${session.user.lastName}`,
          action: 'STATUS_CHANGED',
          details: `Status changed from ${existingCase.status} to ${status}`,
          metadata: JSON.stringify({
            oldStatus: existingCase.status,
            newStatus: status
          })
        }
      });
    }

    // Parse scanFileUrl if it exists
    let parsedScanFiles = {};
    if (updatedCase.scanFileUrl) {
      try {
        parsedScanFiles = JSON.parse(updatedCase.scanFileUrl);
      } catch (e) {
        console.error('Error parsing scanFileUrl:', e);
      }
    }

    // Format response
    const formattedCase = {
      ...updatedCase,
      payment: updatedCase.payments?.[0] || null,
      parsedScanFiles,
    };

    return NextResponse.json({
      success: true,
      case: formattedCase,
      message: (archivedByDentist !== undefined || archived !== undefined)
        ? `Case ${archivedByDentist || archived ? 'archived' : 'restored'} successfully`
        : 'Case updated successfully'
    });
  } catch (error) {
    console.error('Error updating case:', error);
    return NextResponse.json(
      { error: 'Failed to update case', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete case (optional, if needed)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> } // Fixed: params is a Promise
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await the params
    const { caseId } = await params;

    // Only admins can delete cases
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if case exists
    const existingCase = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!existingCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Delete the case (this will cascade delete related records based on your schema)
    await prisma.case.delete({
      where: { id: caseId },
    });

    return NextResponse.json({
      success: true,
      message: 'Case deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting case:', error);
    return NextResponse.json(
      { error: 'Failed to delete case' },
      { status: 500 }
    );
  }
}