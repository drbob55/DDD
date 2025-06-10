// src/app/api/appointments/[appointmentId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BusinessError, handleApiError } from '@core/domain/errors';
import { 
  USER_ROLES, 
  APPOINTMENT_STATUS,
  ACTIVITY_TYPE, 
  TARGET_TYPE,
  LOG_SEVERITY,
  NOTIFICATION_TYPE,
  NOTIFICATION_CATEGORY
} from '@shared/constants';

// DELETE - Cancel appointment
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Await params before destructuring
    const { appointmentId } = await params;

    if (!appointmentId) {
      return NextResponse.json({ 
        success: false,
        error: 'Appointment ID required' 
      }, { status: 400 });
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
      return NextResponse.json({ 
        success: false,
        error: 'Appointment not found' 
      }, { status: 404 });
    }

    // Check if appointment is already cancelled
    if (appointment.status === APPOINTMENT_STATUS.CANCELLED) {
      return NextResponse.json({ 
        success: false,
        error: 'Appointment is already cancelled' 
      }, { status: 400 });
    }

    // Check permissions using constants
    const canCancel = session.user.role === USER_ROLES.ADMIN || 
                     (session.user.role === USER_ROLES.DENTIST && 
                      appointment.case.dentistId === session.user.id);

    if (!canCancel) {
      return NextResponse.json({
        success: false,
        error: 'Not authorized to cancel this appointment'
      }, { status: 403 });
    }

    // Update appointment status to cancelled using constants
    const cancelledAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: APPOINTMENT_STATUS.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: `Cancelled by ${session.user.role.toLowerCase()}`
      }
    });

    // Create notification for patient using constants
    if (appointment.case.patientId) {
      await prisma.notification.create({
        data: {
          userId: appointment.case.patientId,
          title: 'Appointment Cancelled',
          message: `Your appointment on ${appointment.date.toLocaleDateString()} at ${appointment.date.toLocaleTimeString()} has been cancelled`,
          type: NOTIFICATION_TYPE.APPOINTMENT,
          category: NOTIFICATION_CATEGORY.APPOINTMENT,
          priority: 'high',
          metadata: {
            appointmentId: appointmentId,
            appointmentDate: appointment.date.toISOString()
          }
        }
      });
    }

    // Log the activity using constants
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: ACTIVITY_TYPE.APPOINTMENT_CANCELLED,
        targetType: TARGET_TYPE.APPOINTMENT,
        targetId: appointmentId,
        description: `Appointment cancelled for ${appointment.case.patient?.name || 'patient'}`,
        severity: LOG_SEVERITY.INFO,
        metadata: {
          appointmentDate: appointment.date.toISOString(),
          patientName: appointment.case.patient?.name,
          patientId: appointment.case.patientId,
          caseNumber: appointment.case.caseNumber
        }
      }
    });

    // Create case activity
    await prisma.caseActivity.create({
      data: {
        caseId: appointment.caseId,
        userId: session.user.id,
        userName: session.user.name || `${session.user.firstName} ${session.user.lastName}`,
        action: ACTIVITY_TYPE.APPOINTMENT_CANCELLED,
        details: `Appointment cancelled for ${appointment.date.toLocaleDateString()}`,
        metadata: {
          appointmentId,
          appointmentDate: appointment.date.toISOString(),
          appointmentTime: appointment.date.toLocaleTimeString()
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: cancelledAppointment 
    });
  } catch (error) {
    const { statusCode, response } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}