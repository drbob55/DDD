// app/api/cases/[caseId]/files/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@dental/core/infrastructure/prisma/client';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { 
  ACTIVITY_TYPE,
  FILE_TYPE,
  USER_ROLES,
  TARGET_TYPE,
  LOG_SEVERITY,
  BUSINESS_RULES,
  validators
} from '@dental/shared/constants';
import { BusinessError } from '@dental/core/domain/errors/business.error';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'cases');

// Get allowed extensions from business rules or define them
const ALLOWED_EXTENSIONS = ['.stl', '.obj', '.zip', '.ply'];
const MAX_ADDITIONAL_FILES = 10;

export async function POST(
  request: NextRequest,
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

    // Await the params
    const { caseId } = await params;
    
    // Verify case exists and user has permission
    const caseData = await prisma.case.findFirst({
      where: {
        id: caseId,
        // Only dentists and admins can upload files
        ...(session.user.role === USER_ROLES.DENTIST ? { dentistId: session.user.id } : {}),
        ...(session.user.role === USER_ROLES.ADMIN ? {} : { dentistId: session.user.id })
      },
      select: {
        id: true,
        caseNumber: true,
        patientId: true,
        dentistId: true,
        _count: {
          select: { files: true }
        }
      }
    });

    if (!caseData) {
      // Log unauthorized access attempt
      await prisma.log.create({
        data: {
          userId: session.user.id,
          action: ACTIVITY_TYPE.FILE_UPLOADED,
          targetType: TARGET_TYPE.CASE,
          targetId: caseId,
          description: 'Unauthorized file upload attempt',
          severity: LOG_SEVERITY.WARNING,
          metadata: {
            userRole: session.user.role,
            caseId
          }
        }
      }).catch(() => {});

      return NextResponse.json({ error: 'Case not found or unauthorized' }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const fileType = formData.get('fileType') as string || FILE_TYPE.OTHER;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Validate file type
    if (!validators.isValidFileType(fileType)) {
      return NextResponse.json({ 
        error: 'Invalid file type',
        validTypes: Object.values(FILE_TYPE)
      }, { status: 400 });
    }

    // Check total file count
    const currentFileCount = caseData._count.files;
    if (currentFileCount + files.length > MAX_ADDITIONAL_FILES) {
      return NextResponse.json({
        error: `Maximum ${MAX_ADDITIONAL_FILES} files allowed. Currently have ${currentFileCount}.`
      }, { status: 400 });
    }

    // Create case directory if it doesn't exist
    const caseDir = join(UPLOAD_DIR, caseData.caseNumber);
    if (!existsSync(caseDir)) {
      await mkdir(caseDir, { recursive: true });
    }

    const uploadedFiles: any[] = [];
    const errors: string[] = [];

    // Process each file
    for (const file of files) {
      try {
        // Validate file extension
        const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          errors.push(`${file.name}: Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
          continue;
        }

        // Validate file size
        const maxSizeBytes = BUSINESS_RULES.MAX_FILE_SIZE_MB * 1024 * 1024;
        if (file.size > maxSizeBytes) {
          errors.push(`${file.name}: File too large (max ${BUSINESS_RULES.MAX_FILE_SIZE_MB}MB)`);
          continue;
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${caseData.caseNumber}_${fileType}_${timestamp}_${randomStr}_${sanitizedName}`;
        const filePath = join(caseDir, fileName);

        // Save file
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        // Create file record
        const fileRecord = await prisma.caseFile.create({
          data: {
            caseId: caseId,
            type: fileType,
            fileName: fileName,
            originalName: file.name,
            fileUrl: `/uploads/cases/${caseData.caseNumber}/${fileName}`,
            fileSize: file.size,
            mimeType: file.type || 'application/octet-stream',
            uploadedById: session.user.id,
            isPublic: false,
            description: formData.get('description') as string || null
          }
        });

        uploadedFiles.push(fileRecord);

      } catch (error: any) {
        console.error(`Error uploading ${file.name}:`, error);
        errors.push(`${file.name}: Upload failed - ${error.message}`);
      }
    }

    // Log activity if files were uploaded
    if (uploadedFiles.length > 0) {
      await prisma.$transaction(async (tx) => {
        // Create case activity
        await tx.caseActivity.create({
          data: {
            caseId: caseId,
            userId: session.user.id,
            action: ACTIVITY_TYPE.FILE_UPLOADED,
            details: `Uploaded ${uploadedFiles.length} ${fileType} file(s)`,
            metadata: {
              files: uploadedFiles.map(f => ({
                id: f.id,
                name: f.originalName,
                type: f.type,
                size: f.fileSize
              })),
              fileType
            }
          }
        });

        // Log the upload
        await tx.log.create({
          data: {
            userId: session.user.id,
            action: ACTIVITY_TYPE.FILE_UPLOADED,
            targetType: TARGET_TYPE.CASE,
            targetId: caseId,
            description: `Uploaded ${uploadedFiles.length} files to case ${caseData.caseNumber}`,
            severity: LOG_SEVERITY.INFO,
            metadata: {
              caseNumber: caseData.caseNumber,
              fileCount: uploadedFiles.length,
              fileType,
              totalSize: uploadedFiles.reduce((sum, f) => sum + f.fileSize, 0)
            }
          }
        });

        // Notify patient about new files
        if (session.user.id !== caseData.patientId) {
          await tx.notification.create({
            data: {
              userId: caseData.patientId,
              title: 'New Files Added',
              message: `${uploadedFiles.length} new file(s) have been added to your case ${caseData.caseNumber}`,
              type: NOTIFICATION_TYPE.CASE_UPDATE,
              category: NOTIFICATION_CATEGORY.CASE,
              relatedEntityId: caseId,
              relatedEntityType: TARGET_TYPE.CASE,
              actionUrl: `/cases/${caseId}`,
              actionLabel: 'View Files'
            }
          });
        }
      });
    }

    return NextResponse.json({
      success: true,
      filesUploaded: uploadedFiles.length,
      errors: errors.length > 0 ? errors : undefined,
      files: uploadedFiles
    });

  } catch (error: any) {
    console.error('File upload error:', error);
    
    // Log error
    await prisma.log.create({
      data: {
        userId: session?.user?.id,
        action: ACTIVITY_TYPE.SYSTEM_ERROR,
        targetType: TARGET_TYPE.SYSTEM,
        description: 'Error uploading files',
        severity: LOG_SEVERITY.ERROR,
        errorMessage: error.message,
        errorStack: error.stack,
        metadata: { endpoint: '/api/cases/[caseId]/files POST' }
      }
    }).catch(() => {});
    
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    );
  }
}

// GET endpoint - List case files
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { caseId } = await params;

    // Check case access
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        patientId: true,
        dentistId: true,
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
      (session.user.role === USER_ROLES.DENTIST && caseData.dentistId === session.user.id) ||
      (session.user.role === USER_ROLES.PATIENT && caseData.patientId === session.user.id) ||
      (session.user.role === USER_ROLES.REVIEWER && caseData.reviewerId === session.user.id) ||
      (session.user.role === USER_ROLES.MANUFACTURER && caseData.manufacturerId === session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get files
    const files = await prisma.caseFile.findMany({
      where: {
        caseId: caseId,
        deletedAt: null
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      },
      orderBy: { uploadedAt: 'desc' }
    });

    // Group files by type
    const groupedFiles = files.reduce((acc, file) => {
      if (!acc[file.type]) {
        acc[file.type] = [];
      }
      acc[file.type].push(file);
      return acc;
    }, {} as Record<string, typeof files>);

    return NextResponse.json({
      files,
      groupedFiles,
      totalCount: files.length,
      totalSize: files.reduce((sum, f) => sum + f.fileSize, 0)
    });

  } catch (error: any) {
    console.error('Error fetching files:', error);
    
    await prisma.log.create({
      data: {
        userId: session?.user?.id,
        action: ACTIVITY_TYPE.SYSTEM_ERROR,
        targetType: TARGET_TYPE.SYSTEM,
        description: 'Error fetching case files',
        severity: LOG_SEVERITY.ERROR,
        errorMessage: error.message,
        errorStack: error.stack,
        metadata: { endpoint: '/api/cases/[caseId]/files GET' }
      }
    }).catch(() => {});
    
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}