import { prisma } from "@/lib/prisma";
import { ROLES, CASE_STATUS, PAYMENT_STATUS, SEX_OPTIONS } from "@/lib/constants";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// GET: Fetch specific appointment
export async function GET(
  req: NextRequest,
  { params }: { params: { appointmentsId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: params.appointmentsId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        case: {
          select: {
            id: true,
            dentistId: true,
            patient: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Check if user has access to this appointment
    const hasAccess = 
      session.user.role === ROLES.ADMIN ||
      appointment.userId === session.user.id ||
      (session.user.role === ROLES.DENTIST && appointment.case.dentistId === session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ appointment });
  } catch (err: any) {
    console.error("Appointment GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Update appointment
export async function PATCH(
  req: NextRequest,
  { params }: { params: { appointmentsId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only dentists and admins can update appointments
    if (session.user.role !== ROLES.DENTIST && session.user.role !== ROLES.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { date, notes } = await req.json();

    // Get the appointment to check permissions
    const appointment = await prisma.appointment.findUnique({
      where: { id: params.appointmentsId },
      include: {
        case: {
          select: {
            dentistId: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Check if dentist owns the case
    if (session.user.role === ROLES.DENTIST && appointment.case.dentistId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized - not your case" }, { status: 401 });
    }

    // Update the appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id: params.appointmentsId },
      data: {
        ...(date && { date: new Date(date) }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Create notification for patient if date changed
    if (date) {
      await prisma.notification.create({
        data: {
          userId: appointment.userId,
          message: `Your appointment has been rescheduled to ${new Date(date).toLocaleDateString()} at ${new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        },
      });
    }

    // Log the action
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: "APPOINTMENT_UPDATED",
        targetType: "APPOINTMENT",
        targetId: params.appointmentsId,
        details: `Appointment updated`,
      },
    });

    return NextResponse.json({ appointment: updatedAppointment });
  } catch (err: any) {
    console.error("Appointment update error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}