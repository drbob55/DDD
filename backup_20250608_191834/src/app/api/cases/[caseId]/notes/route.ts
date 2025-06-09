// src/app/api/cases/[caseId]/notes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // FIXED: Import from lib/auth
import { prisma } from '@/lib/prisma';
import { ROLES, ACTIVITY_TYPE, TARGET_TYPE } from '@/lib/constants';

// GET: Fetch case notes
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> } // FIXED: params is now a Promise
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // FIXED: Await params before accessing
    const { caseId } = await params;

    // Check if user has access to this case
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        dentistId: true,
        patientId: true,
        reviewerId: true,
        manufacturerId: true,
      }
    });

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Check access based on role
    const hasAccess = 
      session.user.role === ROLES.ADMIN ||
      (session.user.role === ROLES.DENTIST && session.user.id === caseData.dentistId) ||
      (session.user.role === ROLES.PATIENT && session.user.id === caseData.patientId) ||
      (session.user.role === ROLES.REVIEWER && session.user.id === caseData.reviewerId) ||
      (session.user.role === ROLES.MANUFACTURER && session.user.id === caseData.manufacturerId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch notes based on user role
    const where: any = { caseId };
    
    // Patients should only see non-internal notes
    if (session.user.role === ROLES.PATIENT) {
      where.isInternal = false;
    }

    const notes = await prisma.caseNote.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // FIXED: Always return an array, even if empty
    return NextResponse.json(notes || []);

  } catch (error) {
    console.error('Error fetching case notes:', error);
    // FIXED: Return empty array on error to prevent frontend crashes
    return NextResponse.json([], { status: 200 });
  }
}

// POST: Create new case note
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> } // FIXED: params is now a Promise
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // FIXED: Await params
    const { caseId } = await params;
    const body = await req.json();
    const { content, category = 'general', isInternal = true, appointmentId } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 });
    }

    // Check if user has access to this case
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Only dentists and admins can add notes
    const canAddNote = 
      session.user.role === ROLES.ADMIN ||
      (session.user.role === ROLES.DENTIST && session.user.id === caseData.dentistId);

    if (!canAddNote) {
      return NextResponse.json({ error: 'Only dentists and admins can add notes' }, { status: 403 });
    }

    // Create the note
    const note = await prisma.caseNote.create({
      data: {
        caseId,
        userId: session.user.id,
        content: content.trim(),
        category,
        isInternal: session.user.role === ROLES.PATIENT ? false : isInternal,
        appointmentId: appointmentId || null, // Link to appointment if provided
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          }
        }
      }
    });

    // Log the activity
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: ACTIVITY_TYPE.NOTE_ADDED,
        targetType: TARGET_TYPE.NOTE,
        targetId: note.id,
        details: JSON.stringify({
          caseId,
          caseNumber: caseData.caseNumber,
          category,
          notePreview: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
        }),
      },
    });

    // Create case activity
    await prisma.caseActivity.create({
      data: {
        caseId,
        userId: session.user.id,
        userName: session.user.name || `${session.user.firstName} ${session.user.lastName}`,
        action: ACTIVITY_TYPE.NOTE_ADDED,
        details: `Added ${category} note`,
        metadata: JSON.stringify({
          noteId: note.id,
          category,
          appointmentId
        })
      }
    });

    // Create notification for patient if note is not internal
    if (!isInternal && caseData.patientId !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: caseData.patientId,
          message: `Dr. ${session.user.name} added a note to your case #${caseData.caseNumber}`,
          type: 'info',
        },
      });
    }

    return NextResponse.json(note);

  } catch (error) {
    console.error('Error creating case note:', error);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}

// PUT: Update case note
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> } // FIXED: params is now a Promise
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // FIXED: Await params
    const { caseId } = await params;
    const body = await req.json();
    const { noteId, content, category, isInternal } = body;

    if (!noteId) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 });
    }

    // Check if note exists and user can edit it
    const existingNote = await prisma.caseNote.findUnique({
      where: { id: noteId },
      include: {
        case: {
          select: {
            caseNumber: true,
          }
        }
      }
    });

    if (!existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Only the author or admin can edit notes
    const canEdit = 
      session.user.role === ROLES.ADMIN ||
      session.user.id === existingNote.userId;

    if (!canEdit) {
      return NextResponse.json({ error: 'You can only edit your own notes' }, { status: 403 });
    }

    // Update the note
    const updatedNote = await prisma.caseNote.update({
      where: { id: noteId },
      data: {
        content: content?.trim() || existingNote.content,
        category: category || existingNote.category,
        isInternal: isInternal !== undefined ? isInternal : existingNote.isInternal,
        updatedAt: new Date(),
        editedAt: new Date(), // Mark as edited
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          }
        }
      }
    });

    // Log the activity
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: ACTIVITY_TYPE.NOTE_UPDATED,
        targetType: TARGET_TYPE.NOTE,
        targetId: noteId,
        details: JSON.stringify({
          caseId,
          caseNumber: existingNote.case.caseNumber,
          changes: {
            content: content !== existingNote.content,
            category: category !== existingNote.category,
            isInternal: isInternal !== existingNote.isInternal,
          },
        }),
      },
    });

    // Create case activity
    await prisma.caseActivity.create({
      data: {
        caseId,
        userId: session.user.id,
        userName: session.user.name || `${session.user.firstName} ${session.user.lastName}`,
        action: ACTIVITY_TYPE.NOTE_UPDATED,
        details: `Updated ${category || existingNote.category} note`,
        metadata: JSON.stringify({
          noteId,
          changes: {
            content: content !== existingNote.content,
            category: category !== existingNote.category,
            isInternal: isInternal !== existingNote.isInternal,
          }
        })
      }
    });

    return NextResponse.json(updatedNote);

  } catch (error) {
    console.error('Error updating case note:', error);
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    );
  }
}

// DELETE: Delete case note
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> } // FIXED: params is now a Promise
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // FIXED: Await params
    const { caseId } = await params;
    const url = new URL(req.url);
    const noteId = url.searchParams.get('noteId');

    if (!noteId) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 });
    }

    // Check if note exists
    const existingNote = await prisma.caseNote.findUnique({
      where: { id: noteId },
      include: {
        case: {
          select: {
            caseNumber: true,
          }
        }
      }
    });

    if (!existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Only the author or admin can delete notes
    const canDelete = 
      session.user.role === ROLES.ADMIN ||
      session.user.id === existingNote.userId;

    if (!canDelete) {
      return NextResponse.json({ error: 'You can only delete your own notes' }, { status: 403 });
    }

    // Delete the note
    await prisma.caseNote.delete({
      where: { id: noteId },
    });

    // Log the activity
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: ACTIVITY_TYPE.NOTE_DELETED,
        targetType: TARGET_TYPE.NOTE,
        targetId: noteId,
        details: JSON.stringify({
          caseId,
          caseNumber: existingNote.case.caseNumber,
          notePreview: existingNote.content.substring(0, 100) + (existingNote.content.length > 100 ? '...' : ''),
        }),
      },
    });

    // Create case activity
    await prisma.caseActivity.create({
      data: {
        caseId,
        userId: session.user.id,
        userName: session.user.name || `${session.user.firstName} ${session.user.lastName}`,
        action: ACTIVITY_TYPE.NOTE_DELETED,
        details: `Deleted ${existingNote.category} note`,
        metadata: JSON.stringify({
          noteId,
          category: existingNote.category
        })
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting case note:', error);
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}