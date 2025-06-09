// src/app/api/appointments/[appointmentId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ROLES, ACTIVITY_TYPE, TARGET_TYPE } from '@/lib/constants';

// DELETE - Cancel appointment
export async function DELETE(
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

    if (!appointmentId) {
      return NextResponse.json({ error: 'Appointment ID required' }, { status: 400 });
    }

    // Get the appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        case: {
          include: {
            dentist: true,
            patient: true
          }
        }
      }
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Check permissions - Admin can cancel any, Dentist can cancel their own cases' appointments
    const canCancel = session.user.role === ROLES.ADMIN || 
                     (session.user.role === ROLES.DENTIST && 
                      appointment.case.dentistId === session.user.id);

    if (!canCancel) {
      return NextResponse.json(
        { error: 'Not authorized to cancel this appointment' },
        { status: 403 }
      );
    }

    // Update appointment status to cancelled
    const cancelledAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: 'Cancelled by dentist'
      }
    });

    // Create notification for patient
    await prisma.notification.create({
      data: {
        userId: appointment.case.patientId,
        title: 'Appointment Cancelled',
        message: `Your appointment on ${appointment.date.toLocaleDateString()} has been cancelled`,
        type: 'appointment',
        category: 'appointment'
      }
    });

    // Log the activity
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: ACTIVITY_TYPE.APPOINTMENT_CANCELLED,
        targetType: TARGET_TYPE.APPOINTMENT,
        targetId: appointmentId,
        details: JSON.stringify({
          appointmentDate: appointment.date,
          patientName: appointment.case.patient.name
        })
      }
    });

    // Create case activity
    await prisma.caseActivity.create({
      data: {
        caseId: appointment.caseId,
        userId: session.user.id,
        userName: session.user.name || `${session.user.firstName} ${session.user.lastName}`,
        action: ACTIVITY_TYPE.APPOINTMENT_CANCELLED,
        details: `Appointment cancelled`,
        metadata: JSON.stringify({
          appointmentId,
          appointmentDate: appointment.date
        })
      }
    });

    return NextResponse.json({ success: true, appointment: cancelledAppointment });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    return NextResponse.json(
      { error: 'Failed to cancel appointment' },
      { status: 500 }
    );
  }
}