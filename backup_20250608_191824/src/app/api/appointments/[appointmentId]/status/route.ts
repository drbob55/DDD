// src/app/api/appointments/[appointmentId]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ROLES, ACTIVITY_TYPE, TARGET_TYPE } from '@/lib/constants';

// PUT - Update appointment status
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params before destructuring
    const { appointmentId } = await params;
    const body = await req.json();
    const { status } = body;

    // Validate status
    const validStatuses = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Get the appointment with case details
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        case: {
          include: {
            dentist: true,
            patient: true
          }
        },
        user: true,
        clinic: true
      }
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Check permissions
    const canUpdate = session.user.role === ROLES.ADMIN || 
                     (session.user.role === ROLES.DENTIST && 
                      appointment.case.dentistId === session.user.id);

    if (!canUpdate) {
      return NextResponse.json(
        { error: 'Not authorized to update this appointment' },
        { status: 403 }
      );
    }

    // Build update data based on status
    const updateData: any = {
      status,
      updatedAt: new Date()
    };

    // Add status-specific fields
    switch (status) {
      case 'COMPLETED':
        updateData.completedAt = new Date();
        break;
      case 'CANCELLED':
        updateData.cancelledAt = new Date();
        updateData.cancelReason = body.cancelReason || 'Status updated by ' + session.user.role.toLowerCase();
        break;
      case 'NO_SHOW':
        updateData.noShowAt = new Date();
        break;
      case 'SCHEDULED':
        // Reset status-specific timestamps if changing back to scheduled
        updateData.completedAt = null;
        updateData.cancelledAt = null;
        updateData.noShowAt = null;
        updateData.cancelReason = null;
        break;
    }

    // Update the appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: updateData,
      include: {
        case: {
          include: {
            patient: true,
            dentist: true
          }
        },
        clinic: true,
        user: true
      }
    });

    // Create notification for patient
    let notificationMessage = '';
    switch (status) {
      case 'COMPLETED':
        notificationMessage = `Your appointment on ${appointment.date.toLocaleDateString()} has been marked as completed`;
        break;
      case 'CANCELLED':
        notificationMessage = `Your appointment on ${appointment.date.toLocaleDateString()} has been cancelled`;
        break;
      case 'NO_SHOW':
        notificationMessage = `You missed your appointment on ${appointment.date.toLocaleDateString()}`;
        break;
      case 'RESCHEDULED':
        notificationMessage = `Your appointment needs to be rescheduled. Please contact us.`;
        break;
    }

    if (notificationMessage && appointment.case.patientId) {
      await prisma.notification.create({
        data: {
          userId: appointment.case.patientId,
          title: `Appointment ${status}`,
          message: notificationMessage,
          type: 'appointment',
          category: 'appointment'
        }
      });
    }

    // Log the activity
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: `APPOINTMENT_${status}`,
        targetType: TARGET_TYPE.APPOINTMENT,
        targetId: appointmentId,
        details: JSON.stringify({
          previousStatus: appointment.status,
          newStatus: status,
          appointmentDate: appointment.date,
          patientName: appointment.case.patient?.name || appointment.patientName
        })
      }
    });

    // Create case activity
    await prisma.caseActivity.create({
      data: {
        caseId: appointment.caseId,
        userId: session.user.id,
        userName: session.user.name || `${session.user.firstName} ${session.user.lastName}`,
        action: `APPOINTMENT_${status}`,
        details: `Appointment status changed to ${status}`,
        metadata: JSON.stringify({
          appointmentId,
          previousStatus: appointment.status,
          newStatus: status
        })
      }
    });

    // Transform for response - ensure all required fields are present
    const transformedAppointment = {
      id: updatedAppointment.id,
      caseId: updatedAppointment.caseId,
      userId: updatedAppointment.userId,
      date: updatedAppointment.date.toISOString(),
      duration: updatedAppointment.duration,
      clinicId: updatedAppointment.clinicId,
      clinicName: updatedAppointment.clinicName || updatedAppointment.clinic?.name || 'Main Clinic',
      type: updatedAppointment.type,
      reason: updatedAppointment.reason,
      notes: updatedAppointment.notes,
      status: updatedAppointment.status,
      patientId: updatedAppointment.patientId || updatedAppointment.user?.id || updatedAppointment.userId,
      patientName: updatedAppointment.patientName || updatedAppointment.user?.name || updatedAppointment.case?.patient?.name || '',
      caseNumber: updatedAppointment.case?.caseNumber || '',
      dentistId: updatedAppointment.case?.dentist?.id,
      dentistName: updatedAppointment.case?.dentist?.name,
      createdAt: updatedAppointment.createdAt.toISOString(),
      updatedAt: updatedAppointment.updatedAt.toISOString(),
      completedAt: updatedAppointment.completedAt?.toISOString() || null,
      cancelledAt: updatedAppointment.cancelledAt?.toISOString() || null,
      noShowAt: updatedAppointment.noShowAt?.toISOString() || null
    };

    return NextResponse.json({
      success: true,
      appointment: transformedAppointment
    });
  } catch (error) {
    console.error('Error updating appointment status:', error);
    return NextResponse.json(
      { error: 'Failed to update appointment status' },
      { status: 500 }
    );
  }
}