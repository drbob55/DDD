// src/app/api/appointments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ROLES, ACTIVITY_TYPE, TARGET_TYPE } from '@/lib/constants';

// GET - Fetch appointments
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const caseId = url.searchParams.get('caseId');
    const patientId = url.searchParams.get('patientId');
    const dentistId = url.searchParams.get('dentistId');
    const status = url.searchParams.get('status');

    let where: any = {};

    // Role-based filtering
    if (session.user.role === ROLES.DENTIST) {
      // Dentist can see appointments for their cases
      where.case = {
        dentistId: session.user.id
      };
    } else if (session.user.role === ROLES.PATIENT) {
      where.userId = session.user.id;
    } else if (session.user.role === ROLES.ADMIN) {
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
      return NextResponse.json({ error: 'Invalid role' }, { status: 403 });
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

    return NextResponse.json(transformedAppointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}

// POST - Create new appointment
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      caseId,
      date,
      clinicId,
      clinicName,
      reason,
      notes,
      duration = 30,
      patientId,
      patientName,
      caseNumber
    } = body;

    // Validate required fields
    if (!caseId || !date || !clinicId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
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
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Check permissions - only dentist of the case or admin can create appointments
    if (session.user.role !== ROLES.ADMIN && 
        (session.user.role !== ROLES.DENTIST || session.user.id !== caseRecord.dentistId)) {
      return NextResponse.json({ error: 'Not authorized to create appointment for this case' }, { status: 403 });
    }

    // Create the appointment
    const appointment = await prisma.appointment.create({
      data: {
        caseId,
        userId: caseRecord.patientId,
        patientId: caseRecord.patientId,
        patientName: patientName || caseRecord.patient.name,
        date: new Date(req.body.date),
        duration,
        clinicId,
        clinicName: clinicName || 'Main Clinic',
        type: reason || 'FOLLOW_UP',
        reason: reason || 'Regular Checkup',
        notes: notes || '',
        status: 'SCHEDULED'
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

    // Create notification for patient
    await prisma.notification.create({
      data: {
        userId: caseRecord.patientId,
        title: 'New Appointment Scheduled',
        message: `Your appointment has been scheduled for ${new Date(date).toLocaleDateString()} at ${new Date(date).toLocaleTimeString()}`,
        type: 'appointment',
        category: 'appointment',
        actionUrl: `/appointments/${appointment.id}`,
        actionLabel: 'View Details'
      }
    });

    // Log the activity
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: ACTIVITY_TYPE.APPOINTMENT_SCHEDULED,
        targetType: TARGET_TYPE.APPOINTMENT,
        targetId: appointment.id,
        details: JSON.stringify({
          caseId,
          patientName: caseRecord.patient.name,
          date,
          clinicName: clinicName || 'Main Clinic',
          reason
        })
      }
    });

    // Create case activity
    await prisma.caseActivity.create({
      data: {
        caseId,
        userId: session.user.id,
        userName: session.user.name || `${session.user.firstName} ${session.user.lastName}`,
        action: ACTIVITY_TYPE.APPOINTMENT_SCHEDULED,
        details: `Appointment scheduled for ${new Date(date).toLocaleDateString()}`,
        metadata: JSON.stringify({
          appointmentId: appointment.id,
          clinicName,
          reason
        })
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

    return NextResponse.json(transformedAppointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    );
  }
}

// PUT - Update appointment
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      id,
      date,
      clinicId,
      clinicName,
      reason,
      notes,
      status,
      duration
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Appointment ID required' }, { status: 400 });
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
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Check permissions - Admin can update any, Dentist can update their own cases' appointments
    const canUpdate = session.user.role === ROLES.ADMIN || 
                     (session.user.role === ROLES.DENTIST && 
                      existingAppointment.case.dentistId === session.user.id);

    if (!canUpdate) {
      return NextResponse.json(
        { error: 'Not authorized to update this appointment' },
        { status: 403 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (date) updateData.date = new Date(date);
    if (clinicId) {
      updateData.clinicId = clinicId;
      updateData.clinicName = clinicName || existingAppointment.clinicName;
    }
    if (reason) {
      updateData.reason = reason;
      updateData.type = reason;
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
          type: 'appointment',
          category: 'appointment',
          actionUrl: `/appointments/${id}`,
          actionLabel: 'View Details'
        }
      });
    }

    // Log the activity
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: ACTIVITY_TYPE.APPOINTMENT_UPDATED,
        targetType: TARGET_TYPE.APPOINTMENT,
        targetId: id,
        details: JSON.stringify({
          changes: updateData,
          previousDate: existingAppointment.date,
          newDate: date
        })
      }
    });

    // Create case activity
    await prisma.caseActivity.create({
      data: {
        caseId: existingAppointment.caseId,
        userId: session.user.id,
        userName: session.user.name || `${session.user.firstName} ${session.user.lastName}`,
        action: ACTIVITY_TYPE.APPOINTMENT_UPDATED,
        details: `Appointment updated`,
        metadata: JSON.stringify({
          appointmentId: id,
          changes: Object.keys(updateData)
        })
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

    return NextResponse.json(transformedAppointment);
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel appointment
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const appointmentId = url.pathname.split('/').pop();

    if (!appointmentId || appointmentId === 'appointments') {
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