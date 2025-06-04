import { prisma } from "@/lib/prisma";
import { ROLES, CASE_STATUS, PAYMENT_STATUS, SEX_OPTIONS } from "@/lib/constants";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

// GET: Fetch appointments
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const url = new URL(req.url);
    const caseId = url.searchParams.get("caseId");
    const userId = url.searchParams.get("userId");
    
    let where: any = {};
    
    if (caseId) {
      // Verify user has access to this case
      const caseRecord = await prisma.case.findUnique({
        where: { id: caseId },
      });
      
      if (!caseRecord) {
        return NextResponse.json({ error: "Case not found" }, { status: 404 });
      }
      
      const hasAccess = 
        session.user.role === ROLES.ADMIN ||
        (session.user.role === ROLES.DENTIST && caseRecord.dentistId === session.user.id) ||
        (session.user.role === ROLES.PATIENT && caseRecord.patientId === session.user.id) ||
        (session.user.role === ROLES.REVIEWER && caseRecord.reviewerId === session.user.id);
      
      if (!hasAccess) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      
      where.caseId = caseId;
    } else if (userId) {
      // Only admins can query by userId, others can only see their own
      if (session.user.role !== ROLES.ADMIN && userId !== session.user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      where.userId = userId;
    } else {
      // Default to user's own appointments
      where.userId = session.user.id;
    }
    
    const appointments = await prisma.appointment.findMany({
      where,
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
            patient: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });
    
    return NextResponse.json({ appointments });
  } catch (err: any) {
    console.error("Appointments GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Create appointment
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Only dentists and admins can create appointments
    if (session.user.role !== ROLES.DENTIST && session.user.role !== ROLES.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { caseId, date, notes } = await req.json();
    
    if (!caseId || !date) {
      return NextResponse.json({ error: "Case ID and date are required" }, { status: 400 });
    }
    
    // Verify case exists and user has access
    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        patient: true,
      },
    });
    
    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    
    if (session.user.role === ROLES.DENTIST && caseRecord.dentistId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized - not your case" }, { status: 401 });
    }
    
    // Generate unique appointment ID
    const appointmentId = `APT${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    const appointment = await prisma.appointment.create({
      data: {
        id: appointmentId,
        caseId,
        userId: caseRecord.patientId, // Appointment is for the patient
        date: new Date(date),
        notes,
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
    
    // Create notification for patient
    await prisma.notification.create({
      data: {
        userId: caseRecord.patientId,
        message: `New appointment scheduled for ${new Date(date).toLocaleDateString()} at ${new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      },
    });
    
    // Log the action
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: "APPOINTMENT_CREATED",
        targetType: "APPOINTMENT",
        targetId: appointment.id,
        details: `Appointment scheduled for case ${caseId}`,
      },
    });
    
    return NextResponse.json({ appointment });
  } catch (err: any) {
    console.error("Appointment creation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}