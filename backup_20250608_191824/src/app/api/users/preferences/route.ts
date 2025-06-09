// src/app/api/users/preferences/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TARGET_TYPE } from '@/lib/constants';

// Define preferences interface
interface UserPreferences {
  emailNotifications: boolean;
  smsNotifications: boolean;
  appointmentReminders: boolean;
  caseUpdateAlerts: boolean;
  marketingEmails: boolean;
}

// Default preferences
const defaultPreferences: UserPreferences = {
  emailNotifications: true,
  smsNotifications: false,
  appointmentReminders: true,
  caseUpdateAlerts: true,
  marketingEmails: false,
};

// GET: Get user preferences
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has preferences stored in a JSON field or separate table
    // For now, we'll use a simple approach with the Log table to track preferences
    // In production, you should add a UserPreferences table or a JSON field to User model
    
    const lastPreferencesLog = await prisma.log.findFirst({
      where: {
        userId: session.user.id,
        action: 'PREFERENCES_UPDATED',
        targetType: TARGET_TYPE.USER,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let preferences = defaultPreferences;
    
    if (lastPreferencesLog && lastPreferencesLog.details) {
      try {
        const savedPreferences = JSON.parse(lastPreferencesLog.details);
        preferences = { ...defaultPreferences, ...savedPreferences };
      } catch (e) {
        console.error('Error parsing preferences:', e);
      }
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Get preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

// PUT: Update user preferences
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    // Validate preferences
    const validatedPreferences: UserPreferences = {
      emailNotifications: Boolean(body.emailNotifications),
      smsNotifications: Boolean(body.smsNotifications),
      appointmentReminders: Boolean(body.appointmentReminders),
      caseUpdateAlerts: Boolean(body.caseUpdateAlerts),
      marketingEmails: Boolean(body.marketingEmails),
    };

    // In production, save these to a dedicated UserPreferences table
    // For now, we'll log the preferences update
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: 'PREFERENCES_UPDATED',
        targetType: TARGET_TYPE.USER,
        targetId: session.user.id,
        details: JSON.stringify(validatedPreferences),
      },
    });

    // If SMS notifications are enabled, ensure we have a phone number
    if (validatedPreferences.smsNotifications) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { phone: true },
      });

      if (!user?.phone) {
        return NextResponse.json({
          success: true,
          preferences: validatedPreferences,
          warning: 'SMS notifications enabled but no phone number on file. Please add a phone number in your profile.',
        });
      }
    }

    return NextResponse.json({
      success: true,
      preferences: validatedPreferences,
      message: 'Preferences updated successfully',
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}

// DELETE: Reset preferences to default
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Log the reset action
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: 'PREFERENCES_RESET',
        targetType: TARGET_TYPE.USER,
        targetId: session.user.id,
        details: JSON.stringify(defaultPreferences),
      },
    });

    return NextResponse.json({
      success: true,
      preferences: defaultPreferences,
      message: 'Preferences reset to default',
    });
  } catch (error) {
    console.error('Reset preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to reset preferences' },
      { status: 500 }
    );
  }
}