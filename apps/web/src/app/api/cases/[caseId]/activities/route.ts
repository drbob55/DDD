// src/app/api/cases/[caseId]/activities/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // FIXED: Import from lib/auth
import { prisma } from '@/lib/prisma';
import { ROLES, TARGET_TYPE } from '@dental/shared';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> } // FIXED: params is now a Promise
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // FIXED: Await params before destructuring
    const { caseId } = await params;

    // Verify the case exists and user has access
    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        patientId: true,
        dentistId: true,
        reviewerId: true,
        manufacturerId: true,
      },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Check access permissions
    const hasAccess = 
      session.user.role === ROLES.ADMIN ||
      (session.user.role === ROLES.DENTIST && caseRecord.dentistId === session.user.id) ||
      (session.user.role === ROLES.PATIENT && caseRecord.patientId === session.user.id) ||
      (session.user.role === ROLES.REVIEWER && caseRecord.reviewerId === session.user.id) ||
      (session.user.role === ROLES.MANUFACTURER && caseRecord.manufacturerId === session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch activities from logs
    const activities = await prisma.log.findMany({
      where: {
        targetType: TARGET_TYPE.CASE,
        targetId: caseId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to last 50 activities
    });

    // Also fetch appointment-related activities
    const appointments = await prisma.appointment.findMany({
      where: { caseId },
      select: { id: true },
    });

    const appointmentIds = appointments.map(apt => apt.id);

    let appointmentActivities: any[] = [];
    if (appointmentIds.length > 0) {
      appointmentActivities = await prisma.log.findMany({
        where: {
          targetType: TARGET_TYPE.APPOINTMENT,
          targetId: { in: appointmentIds },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    // Combine and sort all activities
    const allActivities = [...activities, ...appointmentActivities]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Format activities for frontend
    const formattedActivities = allActivities.map(activity => {
      let parsedDetails = {};
      
      // Safely parse details
      if (activity.details) {
        try {
          parsedDetails = JSON.parse(activity.details);
        } catch (e) {
          // If details is not valid JSON, treat it as a string
          parsedDetails = { message: activity.details };
        }
      }

      return {
        id: activity.id,
        action: activity.action,
        userId: activity.userId || 'system',
        userName: activity.user?.name || 'System',
        userRole: activity.user?.role || 'SYSTEM',
        targetType: activity.targetType,
        targetId: activity.targetId,
        details: parsedDetails,
        createdAt: activity.createdAt.toISOString(),
      };
    });

    // Always return an array
    return NextResponse.json(formattedActivities);
  } catch (error) {
    console.error('Error fetching case activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch case activities' },
      { status: 500 }
    );
  }
}