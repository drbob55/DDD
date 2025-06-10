// app/api/cases/[caseId]/archive/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // FIXED: Import from lib/auth
import { prisma } from '@/lib/prisma';
import { ROLES, ACTIVITY_TYPE, TARGET_TYPE } from '@dental/shared';

// PUT - Archive or restore a case
export async function PUT(
  req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { archive } = body;

    if (typeof archive !== 'boolean') {
      return NextResponse.json({ error: 'Archive parameter must be a boolean' }, { status: 400 });
    }

    // Get the case to check permissions
    const existingCase = await prisma.case.findUnique({
      where: { id: params.caseId },
      include: { 
        dentist: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        patient: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!existingCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Check permissions - dentist can archive their own cases, admin can archive any
    if (session.user.role !== ROLES.ADMIN && 
        (session.user.role !== ROLES.DENTIST || session.user.id !== existingCase.dentistId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update the case
    const updatedCase = await prisma.case.update({
      where: { id: params.caseId },
      data: {
        archivedByDentist: archive,
        archivedAt: archive ? new Date() : null, // Set archivedAt date when archiving
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
            createdAt: true,
          },
        },
        dentist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        manufacturer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        appointments: {
          orderBy: { date: "asc" },
          take: 1,
        },
        payments: {
          orderBy: { createdAt: "desc" },
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
        }
      }
    });

    // Log the action
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: archive ? ACTIVITY_TYPE.CASE_ARCHIVED : ACTIVITY_TYPE.CASE_RESTORED,
        targetType: TARGET_TYPE.CASE,
        targetId: params.caseId,
        details: JSON.stringify({
          archived: archive,
          caseNumber: existingCase.caseNumber,
          patientName: existingCase.patient.name,
          archivedBy: session.user.role
        })
      }
    });

    // Create case activity
    await prisma.caseActivity.create({
      data: {
        caseId: params.caseId,
        userId: session.user.id,
        userName: session.user.name || `${session.user.firstName} ${session.user.lastName}`,
        action: archive ? ACTIVITY_TYPE.CASE_ARCHIVED : ACTIVITY_TYPE.CASE_RESTORED,
        details: archive ? 'Case archived' : 'Case restored from archive',
      },
    });

    // Create notification for patient
    if (existingCase.patient.id !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: existingCase.patient.id,
          message: `Your case ${existingCase.caseNumber} has been ${archive ? 'archived' : 'restored from archive'}`,
          type: "info"
        }
      });
    }

    // Format response similar to other case endpoints
    const caseWithPayment = {
      ...updatedCase,
      payment: updatedCase.payments?.[0] || null
    };

    return NextResponse.json({
      success: true,
      case: caseWithPayment,
      message: `Case ${archive ? 'archived' : 'restored'} successfully`
    });
  } catch (error) {
    console.error('Error archiving case:', error);
    return NextResponse.json(
      { error: 'Failed to update case', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Also support PATCH method for compatibility
export async function PATCH(
  request: NextRequest,
  context: { params: { caseId: string } }
) {
  return PUT(request, context);
}