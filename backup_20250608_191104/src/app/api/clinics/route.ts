// src/app/api/clinics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ROLES } from '@/lib/constants';

// GET: List clinics for the current dentist
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only dentists and admins can access clinics
    if (session.user.role !== ROLES.DENTIST && session.user.role !== ROLES.ADMIN) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const clinics = await prisma.clinic.findMany({
      where: {
        dentistId: session.user.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json(clinics);
  } catch (error) {
    console.error('Get clinics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clinics' },
      { status: 500 }
    );
  }
}

// POST: Create a new clinic
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only dentists can create clinics
    if (session.user.role !== ROLES.DENTIST) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const { name, address, phone, email } = body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Clinic name is required' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check clinic limit (optional - e.g., max 5 clinics per dentist)
    const clinicCount = await prisma.clinic.count({
      where: { dentistId: session.user.id },
    });

    if (clinicCount >= 10) {
      return NextResponse.json(
        { error: 'Maximum clinic limit reached (10 clinics)' },
        { status: 400 }
      );
    }

    // Create clinic
    const clinic = await prisma.clinic.create({
      data: {
        name: name.trim(),
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        dentistId: session.user.id,
      },
    });

    // Log the action
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: 'CLINIC_CREATED',
        targetType: 'CLINIC',
        targetId: clinic.id,
        details: `Created clinic: ${clinic.name}`,
      },
    });

    return NextResponse.json(clinic);
  } catch (error) {
    console.error('Create clinic error:', error);
    return NextResponse.json(
      { error: 'Failed to create clinic' },
      { status: 500 }
    );
  }
}

// PUT: Update a clinic
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== ROLES.DENTIST) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, address, phone, email } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Clinic ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const clinic = await prisma.clinic.findFirst({
      where: {
        id,
        dentistId: session.user.id,
      },
    });

    if (!clinic) {
      return NextResponse.json(
        { error: 'Clinic not found or access denied' },
        { status: 404 }
      );
    }

    // Update clinic
    const updatedClinic = await prisma.clinic.update({
      where: { id },
      data: {
        name: name?.trim() || clinic.name,
        address: address?.trim(),
        phone: phone?.trim(),
        email: email?.trim(),
      },
    });

    // Log the action
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: 'CLINIC_UPDATED',
        targetType: 'CLINIC',
        targetId: clinic.id,
        details: `Updated clinic: ${updatedClinic.name}`,
      },
    });

    return NextResponse.json(updatedClinic);
  } catch (error) {
    console.error('Update clinic error:', error);
    return NextResponse.json(
      { error: 'Failed to update clinic' },
      { status: 500 }
    );
  }
}