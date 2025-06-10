// src/app/api/cases/[caseId]/notes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@dental/core/infrastructure/prisma/client';
import { 
  USER_ROLES,
  ACTIVITY_TYPE,
  TARGET_TYPE,
  NOTE_CATEGORY,
  LOG_SEVERITY,
  NOTIFICATION_TYPE,
  NOTIFICATION_CATEGORY,
  validators
} from '@dental/shared/constants';
import { BusinessError } from '@dental/core/domain/errors/business.error';

// GET: Fetch case notes
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate user role
    if (!validators.isValidUserRole(session.user.role)) {
      return NextResponse.json({ error: 'Invalid user role' }, { status: 400 });
    }

    // Await params
    const { caseId } = await params;

    // Check if user has access to this case
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        caseNumber: true,
        dentistId: true,
        patientId: true,
        reviewerId: true,
        manufacturerId: true,
        status: true
      }
    });

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Check access based on role
    const hasAccess = 
      session.user.role === USER_ROLES.ADMIN ||
      (session.user.role === USER_ROLES.DENTIST && session.user.id === caseData.dentistId) ||
      (session.user.role === USER_ROLES.PATIENT && session.user.id === caseData.patientId) ||
      (session.user.role === USER_ROLES.REVIEWER && session.user.id === caseData.reviewerId) ||
      (session.user.role === USER_ROLES.MANUFACTURER && session.user.id === caseData.manufacturerId);

    if (!hasAccess) {
      // Log unauthorized access attempt
      await prisma.log.create({
        data: {
          userId: session.user.id,
          action: ACTIVITY_TYPE.NOTE_VIEWED,
          targetType: TARGET_TYPE.CASE,
          targetId: caseId,
          description: 'Unauthorized notes access attempt',
          severity: LOG_SEVERITY.WARNING,
          metadata: {
            userRole: session.user.role,
            caseNumber: caseData.caseNumber
          }
        }
      }).catch(() => {});

      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch notes based on user role
    const where: any = { caseId };
    
    // Patients should only see non-internal notes
    if (session.user.role === USER_ROLES.PATIENT) {
      where.isInternal = false;
    }

    const notes = await prisma.caseNote.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          }
        },
        appointment: {
          select: {
            id: true,
            scheduledAt: true,
            type: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Log access
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: ACTIVITY_TYPE.NOTE_VIEWED,
        targetType: TARGET_TYPE.CASE,
        targetId: caseId,
        description: `Viewed ${notes.length} notes for case ${caseData.caseNumber}`,
        severity: LOG_SEVERITY.INFO,
        metadata: {
          caseNumber: caseData.caseNumber,
          noteCount: notes.length,
          includesInternal: session.user.role !== USER_ROLES.PATIENT
        }
      }
    }).catch(() => {});

    // Format notes with full names
    const formattedNotes = notes.map(note => ({
      ...note,
      user: {
        ...note.user,
        fullName: `${note.user.firstName} ${note.user.lastName}`
      }
    }));

    return NextResponse.json(formattedNotes);

  } catch (error: any) {
    console.error('Error fetching case notes:', error);
    
    // Log error
    await prisma.log.create({
      data: {
        userId: session?.user?.id,
        action: ACTIVITY_TYPE.SYSTEM_ERROR,
        targetType: TARGET_TYPE.SYSTEM,
        description: 'Error fetching case notes',
        severity: LOG_SEVERITY.ERROR,
        errorMessage: error.message,
        errorStack: error.stack,
        metadata: { endpoint: '/api/cases/[caseId]/notes GET' }
      }
    }).catch(() => {});
    
    // Return empty array to prevent frontend crashes
    return NextResponse.json([], { status: 200 });
  }
}

// POST: Create new case note
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { caseId } = await params;
    const body = await req.json();
    const { content, category = NOTE_CATEGORY.GENERAL, isInternal = true, appointmentId } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 });
    }

    // Validate category
    if (!validators.isValidNoteCategory(category)) {
      return NextResponse.json({ 
        error: 'Invalid note category',
        validCategories: Object.values(NOTE_CATEGORY)
      }, { status: 400 });
    }

    // Check if user has access to this case
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        dentist: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Only specific roles can add notes
    const canAddNote = 
      session.user.role === USER_ROLES.ADMIN ||
      (session.user.role === USER_ROLES.DENTIST && session.user.id === caseData.dentistId) ||
      (session.user.role === USER_ROLES.REVIEWER && caseData.reviewerId === session.user.id);

    if (!canAddNote) {
      return NextResponse.json({ 
        error: 'Only dentists, reviewers, and admins can add notes' 
      }, { status: 403 });
    }

    // Patients cannot create internal notes
    const finalIsInternal = session.user.role === USER_ROLES.PATIENT ? false : isInternal;

    // Create the note
    const note = await prisma.$transaction(async (tx) => {
      // Create note
      const newNote = await tx.caseNote.create({
        data: {
          caseId,
          userId: session.user.id,
          content: content.trim(),
          category,
          isInternal: finalIsInternal,
          appointmentId: appointmentId || null,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            }
          }
        }
      });

      // Log the activity
      await tx.log.create({
        data: {
          userId: session.user.id,
          action: ACTIVITY_TYPE.NOTE_ADDED,
          targetType: TARGET_TYPE.NOTE,
          targetId: newNote.id,
          description: `Added ${category} note to case ${caseData.caseNumber}`,
          severity: LOG_SEVERITY.INFO,
          metadata: {
            caseId,
            caseNumber: caseData.caseNumber,
            category,
            isInternal: finalIsInternal,
            notePreview: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
          }
        }
      });

      // Create case activity
      await tx.caseActivity.create({
        data: {
          caseId,
          userId: session.user.id,
          action: ACTIVITY_TYPE.NOTE_ADDED,
          details: `Added ${category} note`,
          metadata: {
            noteId: newNote.id,
            category,
            isInternal: finalIsInternal,
            appointmentId
          }
        }
      });

      // Create notification for patient if note is not internal
      if (!finalIsInternal && caseData.patientId !== session.user.id) {
        await tx.notification.create({
          data: {
            userId: caseData.patientId,
            title: 'New Note Added',
            message: `Dr. ${session.user.firstName} ${session.user.lastName} added a note to your case #${caseData.caseNumber}`,
            type: NOTIFICATION_TYPE.CASE_UPDATE,
            category: NOTIFICATION_CATEGORY.CASE,
            relatedEntityId: caseId,
            relatedEntityType: TARGET_TYPE.CASE,
            actionUrl: `/cases/${caseId}`,
            actionLabel: 'View Note'
          }
        });
      }

      return newNote;
    });

    // Format response
    const formattedNote = {
      ...note,
      user: {
        ...note.user,
        fullName: `${note.user.firstName} ${note.user.lastName}`
      }
    };

    return NextResponse.json(formattedNote);

  } catch (error: any) {
    console.error('Error creating case note:', error);
    
    await prisma.log.create({
      data: {
        userId: session?.user?.id,
        action: ACTIVITY_TYPE.SYSTEM_ERROR,
        targetType: TARGET_TYPE.SYSTEM,
        description: 'Error creating case note',
        severity: LOG_SEVERITY.ERROR,
        errorMessage: error.message,
        errorStack: error.stack,
        metadata: { endpoint: '/api/cases/[caseId]/notes POST' }
      }
    }).catch(() => {});

    if (error instanceof BusinessError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error.name === 'ValidationError') {
      return NextResponse.json({ 
        error: error.message,
        field: error.field,
        validValues: error.validValues
      }, { status: 400 });
    }
    
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}

// PUT: Update case note
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { caseId } = await params;
    const body = await req.json();
    const { noteId, content, category, isInternal } = body;

    if (!noteId) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 });
    }

    // Validate category if provided
    if (category && !validators.isValidNoteCategory(category)) {
      return NextResponse.json({ 
        error: 'Invalid note category',
        validCategories: Object.values(NOTE_CATEGORY)
      }, { status: 400 });
    }

    // Check if note exists and user can edit it
    const existingNote = await prisma.caseNote.findUnique({
      where: { id: noteId },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            patientId: true
          }
        }
      }
    });

    if (!existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    if (existingNote.caseId !== caseId) {
      return NextResponse.json({ error: 'Note does not belong to this case' }, { status: 400 });
    }

    // Only the author or admin can edit notes
    const canEdit = 
      session.user.role === USER_ROLES.ADMIN ||
      session.user.id === existingNote.userId;

    if (!canEdit) {
      return NextResponse.json({ error: 'You can only edit your own notes' }, { status: 403 });
    }

    // Update the note
    const updatedNote = await prisma.$transaction(async (tx) => {
      const updated = await tx.caseNote.update({
        where: { id: noteId },
        data: {
          content: content?.trim() || existingNote.content,
          category: category || existingNote.category,
          isInternal: isInternal !== undefined ? isInternal : existingNote.isInternal,
          isEdited: true,
          editedAt: new Date(),
          updatedAt: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            }
          }
        }
      });

      // Log the activity
      await tx.log.create({
        data: {
          userId: session.user.id,
          action: ACTIVITY_TYPE.NOTE_UPDATED,
          targetType: TARGET_TYPE.NOTE,
          targetId: noteId,
          description: `Updated note in case ${existingNote.case.caseNumber}`,
          severity: LOG_SEVERITY.INFO,
          metadata: {
            caseId,
            caseNumber: existingNote.case.caseNumber,
            changes: {
              content: content !== undefined && content !== existingNote.content,
              category: category !== undefined && category !== existingNote.category,
              isInternal: isInternal !== undefined && isInternal !== existingNote.isInternal,
            }
          }
        }
      });

      // Create case activity
      await tx.caseActivity.create({
        data: {
          caseId,
          userId: session.user.id,
          action: ACTIVITY_TYPE.NOTE_UPDATED,
          details: `Updated ${category || existingNote.category} note`,
          metadata: {
            noteId,
            changes: {
              content: content !== undefined && content !== existingNote.content,
              category: category !== undefined && category !== existingNote.category,
              isInternal: isInternal !== undefined && isInternal !== existingNote.isInternal,
            }
          }
        }
      });

      // Notify patient if note visibility changed to non-internal
      if (isInternal === false && existingNote.isInternal === true && 
          existingNote.case.patientId !== session.user.id) {
        await tx.notification.create({
          data: {
            userId: existingNote.case.patientId,
            title: 'Note Updated',
            message: `A note in your case #${existingNote.case.caseNumber} has been updated and is now visible to you`,
            type: NOTIFICATION_TYPE.CASE_UPDATE,
            category: NOTIFICATION_CATEGORY.CASE,
            relatedEntityId: caseId,
            relatedEntityType: TARGET_TYPE.CASE,
            actionUrl: `/cases/${caseId}`,
            actionLabel: 'View Note'
          }
        });
      }

      return updated;
    });

    // Format response
    const formattedNote = {
      ...updatedNote,
      user: {
        ...updatedNote.user,
        fullName: `${updatedNote.user.firstName} ${updatedNote.user.lastName}`
      }
    };

    return NextResponse.json(formattedNote);

  } catch (error: any) {
    console.error('Error updating case note:', error);
    
    await prisma.log.create({
      data: {
        userId: session?.user?.id,
        action: ACTIVITY_TYPE.SYSTEM_ERROR,
        targetType: TARGET_TYPE.SYSTEM,
        description: 'Error updating case note',
        severity: LOG_SEVERITY.ERROR,
        errorMessage: error.message,
        errorStack: error.stack,
        metadata: { endpoint: '/api/cases/[caseId]/notes PUT' }
      }
    }).catch(() => {});
    
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    );
  }
}

// DELETE: Delete case note
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
            id: true,
            caseNumber: true,
          }
        }
      }
    });

    if (!existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    if (existingNote.caseId !== caseId) {
      return NextResponse.json({ error: 'Note does not belong to this case' }, { status: 400 });
    }

    // Only the author or admin can delete notes
    const canDelete = 
      session.user.role === USER_ROLES.ADMIN ||
      session.user.id === existingNote.userId;

    if (!canDelete) {
      return NextResponse.json({ error: 'You can only delete your own notes' }, { status: 403 });
    }

    // Delete the note
    await prisma.$transaction(async (tx) => {
      await tx.caseNote.delete({
        where: { id: noteId },
      });

      // Log the activity
      await tx.log.create({
        data: {
          userId: session.user.id,
          action: ACTIVITY_TYPE.NOTE_DELETED,
          targetType: TARGET_TYPE.NOTE,
          targetId: noteId,
          description: `Deleted note from case ${existingNote.case.caseNumber}`,
          severity: LOG_SEVERITY.INFO,
          metadata: {
            caseId,
            caseNumber: existingNote.case.caseNumber,
            category: existingNote.category,
            notePreview: existingNote.content.substring(0, 100) + (existingNote.content.length > 100 ? '...' : ''),
          }
        }
      });

      // Create case activity
      await tx.caseActivity.create({
        data: {
          caseId,
          userId: session.user.id,
          action: ACTIVITY_TYPE.NOTE_DELETED,
          details: `Deleted ${existingNote.category} note`,
          metadata: {
            noteId,
            category: existingNote.category
          }
        }
      });
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error deleting case note:', error);
    
    await prisma.log.create({
      data: {
        userId: session?.user?.id,
        action: ACTIVITY_TYPE.SYSTEM_ERROR,
        targetType: TARGET_TYPE.SYSTEM,
        description: 'Error deleting case note',
        severity: LOG_SEVERITY.ERROR,
        errorMessage: error.message,
        errorStack: error.stack,
        metadata: { endpoint: '/api/cases/[caseId]/notes DELETE' }
      }
    }).catch(() => {});
    
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}