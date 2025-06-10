// src/app/api/clinics/[clinicId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../../apps/web/src/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { ROLES } from '@/lib/constants';

// DELETE: Delete a clinic
export async function DELETE(
  req: NextRequest,
  { params }: { params: { clinicId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== ROLES.DENTIST) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const clinicId = params.clinicId;

    // Verify ownership
    const clinic = await prisma.clinic.findFirst({
      where: {
        id: clinicId,
        dentistId: session.user.id,
      },
      include: {
        appointments: {
          where: {
            status: 'SCHEDULED',
          },
        },
      },
    });

    if (!clinic) {
      return NextResponse.json(
        { error: 'Clinic not found or access denied' },
        { status: 404 }
      );
    }

    // Prevent deletion if there are scheduled appointments
    if (clinic.appointments.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete clinic with scheduled appointments',
          scheduledAppointments: clinic.appointments.length 
        },
        { status: 400 }
      );
    }

    // Check if this is the last clinic
    const clinicCount = await prisma.clinic.count({
      where: { dentistId: session.user.id },
    });

    if (clinicCount === 1) {
      return NextResponse.json(
        { error: 'Cannot delete your last clinic. You must have at least one clinic.' },
        { status: 400 }
      );
    }

    // Delete the clinic
    await prisma.clinic.delete({
      where: { id: clinicId },
    });

    // Log the action
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: 'CLINIC_DELETED',
        targetType: 'CLINIC',
        targetId: clinicId,
        details: `Deleted clinic: ${clinic.name}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Clinic deleted successfully',
    });
  } catch (error) {
    console.error('Delete clinic error:', error);
    return NextResponse.json(
      { error: 'Failed to delete clinic' },
      { status: 500 }
    );
  }
}

// GET: Get single clinic details
export async function GET(
  req: NextRequest,
  { params }: { params: { clinicId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clinicId = params.clinicId;

    const clinic = await prisma.clinic.findFirst({
      where: {
        id: clinicId,
        dentistId: session.user.id,
      },
      include: {
        _count: {
          select: {
            appointments: true,
          },
        },
      },
    });

    if (!clinic) {
      return NextResponse.json(
        { error: 'Clinic not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json(clinic);
  } catch (error) {
    console.error('Get clinic error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clinic' },
      { status: 500 }
    );
  }
}