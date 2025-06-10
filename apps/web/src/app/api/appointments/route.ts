// src/app/api/appointments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@dental/core/infrastructure/prisma/client';
import { BusinessError } from '@dental/core/domain/errors/business.error';
import { 
  USER_ROLES, 
  APPOINTMENT_STATUS,
  APPOINTMENT_TYPE,
  ACTIVITY_TYPE, 
  TARGET_TYPE,
  LOG_SEVERITY,
  NOTIFICATION_TYPE,
  NOTIFICATION_CATEGORY,
  BUSINESS_RULES,
  validators
} from '@dental/shared/constants';

// GET - Fetch appointments
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const url = new URL(req.url);
    const caseId = url.searchParams.get('caseId');
    const patientId = url.searchParams.get('patientId');
    const dentistId = url.searchParams.get('dentistId');
    const status = url.searchParams.get('status');

    // Validate status if provided
    if (status && !validators.isValidAppointmentStatus(status)) {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid appointment status',
        validValues: Object.values(APPOINTMENT_STATUS)
      }, { status: 400 });
    }

    let where: any = {};

    // Role-based filtering using constants
    if (session.user.role === USER_ROLES.DENTIST) {
      // Dentist can see appointments for their cases
      where.case = {
        dentistId: session.user.id
      };
    } else if (session.user.role === USER_ROLES.PATIENT) {
      where.userId = session.user.id;
    } else if (session.user.role === USER_ROLES.ADMIN) {
      // Admin can see all appointments, apply filters if provided
      if (caseId) where.caseId = caseId;
      if (patientId) where.userId = patientId;
      if (dentistId) {
        where.case = {
          dentistId: dentistId
        };
      }
      if (status) where.status = status;
    } else {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid role for accessing appointments' 
      }, { status: 403 });
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        case: {
          include: {
            patient: {
              select: {
                id: true,
                userId: true,
                name: true,
                email: true,
                phone: true
              }
            },
            dentist: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        clinic: true,
        user: {
          select: {
            id: true,
            userId: true,
            name: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    // Transform appointments to include flattened data for compatibility
    const transformedAppointments = appointments.map(apt => ({
      ...apt,
      patientId: apt.user?.id || apt.userId,
      patientName: apt.user?.name || apt.patientName || apt.case?.patient?.name || '',
      caseNumber: apt.case?.caseNumber || '',
      dentistId: apt.case?.dentist?.id,
      dentistName: apt.case?.dentist?.name,
      clinicName: apt.clinic?.name || apt.clinicName || 'Main Clinic'
    }));

    return NextResponse.json({
      success: true,
      data: transformedAppointments
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch appointments'
    }, { status: 500 });
  }
}

// POST - Create new appointment
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const body = await req.json();
    const {
      caseId,
      date,
      clinicId,
      clinicName,
      type,
      reason,
      notes,
      duration = BUSINESS_RULES.DEFAULT_APPOINTMENT_DURATION_MINUTES,
      patientId,
      patientName,
      caseNumber
    } = body;

    // Validate required fields
    if (!caseId || !date || !clinicId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: caseId, date, and clinicId are required'
      }, { status: 400 });
    }

    // Validate appointment type if provided
    if (type && !validators.isValidAppointmentType(type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid appointment type',
        validValues: Object.values(APPOINTMENT_TYPE)
      }, { status: 400 });
    }

    // Validate appointment date is in the future
    const appointmentDate = new Date(date);
    if (appointmentDate <= new Date()) {
      return NextResponse.json({
        success: false,
        error: 'Appointment date must be in the future'
      }, { status: 400 });
    }

    // Get the case to verify permissions and get patient info
    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        patient: true,
        dentist: true
      }
    });

    if (!caseRecord) {
      return NextResponse.json({ 
        success: false,
        error: 'Case not found' 
      }, { status: 404 });
    }

    // Check permissions - only dentist of the case or admin can create appointments
    if (session.user.role !== USER_ROLES.ADMIN && 
        (session.user.role !== USER_ROLES.DENTIST || session.user.id !== caseRecord.dentistId)) {
      return NextResponse.json({ 
        success: false,
        error: 'Not authorized to create appointment for this case' 
      }, { status: 403 });
    }

    // Create the appointment with constants
    const appointment = await prisma.appointment.create({
      data: {
        caseId,
        userId: caseRecord.patientId,
        patientId: caseRecord.patientId,
        patientName: patientName || caseRecord.patient.name,
        date: appointmentDate,
        duration,
        clinicId,
        clinicName: clinicName || 'Main Clinic',
        type: type || APPOINTMENT_TYPE.FOLLOW_UP,
        reason: reason || 'Regular Checkup',
        notes: notes || '',
        status: APPOINTMENT_STATUS.SCHEDULED
      },
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

    // Create notification for patient using constants
    await prisma.notification.create({
      data: {
        userId: caseRecord.patientId,
        title: 'New Appointment Scheduled',
        message: `Your appointment has been scheduled for ${appointmentDate.toLocaleDateString()} at ${appointmentDate.toLocaleTimeString()}`,
        type: NOTIFICATION_TYPE.APPOINTMENT,
        category: NOTIFICATION_CATEGORY.APPOINTMENT,
        priority: 'medium',
        actionUrl: `/appointments/${appointment.id}`,
        actionLabel: 'View Details',
        metadata: {
          appointmentId: appointment.id,
          appointmentDate: appointmentDate.toISOString(),
          clinicName: clinicName || 'Main Clinic'
        }
      }
    });

    // Log the activity using constants
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: ACTIVITY_TYPE.APPOINTMENT_SCHEDULED,
        targetType: TARGET_TYPE.APPOINTMENT,
        targetId: appointment.id,
        description: `Appointment scheduled for ${caseRecord.patient.name}`,
        severity: LOG_SEVERITY.INFO,
        metadata: {
          caseId,
          patientName: caseRecord.patient.name,
          date: appointmentDate.toISOString(),
          clinicName: clinicName || 'Main Clinic',
          type: type || APPOINTMENT_TYPE.FOLLOW_UP,
          reason
        }
      }
    });

    // Create case activity
    await prisma.caseActivity.create({
      data: {
        caseId,
        userId: session.user.id,
        userName: session.user.name || `${session.user.firstName} ${session.user.lastName}`,
        action: ACTIVITY_TYPE.APPOINTMENT_SCHEDULED,
        details: `Appointment scheduled for ${appointmentDate.toLocaleDateString()} at ${appointmentDate.toLocaleTimeString()}`,
        metadata: {
          appointmentId: appointment.id,
          clinicName,
          type: type || APPOINTMENT_TYPE.FOLLOW_UP,
          reason
        }
      }
    });

    // Transform for response
    const transformedAppointment = {
      ...appointment,
      patientId: appointment.user?.id || appointment.userId,
      patientName: appointment.user?.name || appointment.patientName || appointment.case?.patient?.name || '',
      caseNumber: appointment.case?.caseNumber || caseNumber || '',
      dentistId: appointment.case?.dentist?.id,
      dentistName: appointment.case?.dentist?.name,
      clinicName: appointment.clinic?.name || appointment.clinicName || 'Main Clinic'
    };

    return NextResponse.json({
      success: true,
      data: transformedAppointment
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    
    if (error instanceof BusinessError) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to create appointment'
    }, { status: 500 });
  }
}

// PUT - Update appointment
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const body = await req.json();
    const {
      id,
      date,
      clinicId,
      clinicName,
      type,
      reason,
      notes,
      status,
      duration
    } = body;

    if (!id) {
      return NextResponse.json({ 
        success: false,
        error: 'Appointment ID required' 
      }, { status: 400 });
    }

    // Validate status if provided
    if (status && !validators.isValidAppointmentStatus(status)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid appointment status',
        validValues: Object.values(APPOINTMENT_STATUS)
      }, { status: 400 });
    }

    // Validate type if provided
    if (type && !validators.isValidAppointmentType(type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid appointment type',
        validValues: Object.values(APPOINTMENT_TYPE)
      }, { status: 400 });
    }

    // Get the appointment with case details
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        case: {
          include: {
            dentist: true,
            patient: true
          }
        }
      }
    });

    if (!existingAppointment) {
      return NextResponse.json({ 
        success: false,
        error: 'Appointment not found' 
      }, { status: 404 });
    }

    // Check permissions using constants
    const canUpdate = session.user.role === USER_ROLES.ADMIN || 
                     (session.user.role === USER_ROLES.DENTIST && 
                      existingAppointment.case.dentistId === session.user.id);

    if (!canUpdate) {
      return NextResponse.json({
        success: false,
        error: 'Not authorized to update this appointment'
      }, { status: 403 });
    }

    // Build update data
    const updateData: any = {};
    if (date) {
      const newDate = new Date(date);
      if (newDate <= new Date()) {
        return NextResponse.json({
          success: false,
          error: 'Appointment date must be in the future'
        }, { status: 400 });
      }
      updateData.date = newDate;
    }
    if (clinicId) {
      updateData.clinicId = clinicId;
      updateData.clinicName = clinicName || existingAppointment.clinicName;
    }
    if (type) {
      updateData.type = type;
    }
    if (reason) {
      updateData.reason = reason;
    }
    if (notes !== undefined) updateData.notes = notes;
    if (status) updateData.status = status;
    if (duration) updateData.duration = duration;

    // Update the appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
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

    // Create notification for patient if date changed
    if (date && new Date(date).getTime() !== existingAppointment.date.getTime()) {
      await prisma.notification.create({
        data: {
          userId: existingAppointment.case.patientId,
          title: 'Appointment Rescheduled',
          message: `Your appointment has been rescheduled to ${new Date(date).toLocaleDateString()} at ${new Date(date).toLocaleTimeString()}`,
          type: NOTIFICATION_TYPE.APPOINTMENT,
          category: NOTIFICATION_CATEGORY.APPOINTMENT,
          priority: 'high',
          actionUrl: `/appointments/${id}`,
          actionLabel: 'View Details',
          metadata: {
            appointmentId: id,
            previousDate: existingAppointment.date.toISOString(),
            newDate: new Date(date).toISOString()
          }
        }
      });
    }

    // Log the activity using constants
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: ACTIVITY_TYPE.APPOINTMENT_UPDATED,
        targetType: TARGET_TYPE.APPOINTMENT,
        targetId: id,
        description: `Appointment updated`,
        severity: LOG_SEVERITY.INFO,
        metadata: {
          changes: updateData,
          previousDate: existingAppointment.date.toISOString(),
          newDate: date ? new Date(date).toISOString() : undefined
        }
      }
    });

    // Create case activity
    await prisma.caseActivity.create({
      data: {
        caseId: existingAppointment.caseId,
        userId: session.user.id,
        userName: session.user.name || `${session.user.firstName} ${session.user.lastName}`,
        action: ACTIVITY_TYPE.APPOINTMENT_UPDATED,
        details: `Appointment updated${date ? ' - rescheduled to ' + new Date(date).toLocaleDateString() : ''}`,
        metadata: {
          appointmentId: id,
          changes: Object.keys(updateData)
        }
      }
    });

    // Transform for response
    const transformedAppointment = {
      ...updatedAppointment,
      patientId: updatedAppointment.user?.id || updatedAppointment.userId,
      patientName: updatedAppointment.user?.name || updatedAppointment.patientName || updatedAppointment.case?.patient?.name || '',
      caseNumber: updatedAppointment.case?.caseNumber || '',
      dentistId: updatedAppointment.case?.dentist?.id,
      dentistName: updatedAppointment.case?.dentist?.name,
      clinicName: updatedAppointment.clinic?.name || updatedAppointment.clinicName || 'Main Clinic'
    };

    return NextResponse.json({
      success: true,
      data: transformedAppointment
    });
  } catch (error) {
    console.error('Error updating appointment:', error);
    
    if (error instanceof BusinessError) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to update appointment'
    }, { status: 500 });
  }
}

// DELETE - Cancel appointment
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const url = new URL(req.url);
    const appointmentId = url.pathname.split('/').pop();

    if (!appointmentId || appointmentId === 'appointments') {
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
    await prisma.notification.create({
      data: {
        userId: appointment.case.patientId,
        title: 'Appointment Cancelled',
        message: `Your appointment on ${appointment.date.toLocaleDateString()} has been cancelled`,
        type: NOTIFICATION_TYPE.APPOINTMENT,
        category: NOTIFICATION_CATEGORY.APPOINTMENT,
        priority: 'high',
        metadata: {
          appointmentId: appointmentId,
          appointmentDate: appointment.date.toISOString()
        }
      }
    });

    // Log the activity using constants
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: ACTIVITY_TYPE.APPOINTMENT_CANCELLED,
        targetType: TARGET_TYPE.APPOINTMENT,
        targetId: appointmentId,
        description: `Appointment cancelled for ${appointment.case.patient.name}`,
        severity: LOG_SEVERITY.INFO,
        metadata: {
          appointmentDate: appointment.date.toISOString(),
          patientName: appointment.case.patient.name,
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
          appointmentDate: appointment.date.toISOString()
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: cancelledAppointment 
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    
    if (error instanceof BusinessError) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to cancel appointment'
    }, { status: 500 });
  }
}