// app/api/cases/[caseId]/files/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { ACTIVITY_TYPE } from '@/lib/constants';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'cases');
const ALLOWED_EXTENSIONS = ['.stl', '.obj', '.zip', '.ply'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_ADDITIONAL_FILES = 10;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await the params (required in Next.js 13+ App Router)
    const { caseId } = await params;
    
    // Verify case exists and user has permission
    const caseData = await prisma.case.findFirst({
      where: {
        id: caseId,
        ...(session.user.role === 'DENTIST' ? { dentistId: session.user.id } : {})
      },
      select: {
        id: true,
        caseNumber: true,
        scanFileUrl: true
      }
    });

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found or unauthorized' }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Parse existing files
    let existingFiles: any = {};
    if (caseData.scanFileUrl) {
      try {
        existingFiles = JSON.parse(caseData.scanFileUrl);
      } catch (e) {
        console.error('Error parsing existing files:', e);
      }
    }

    // Check total file count
    const currentAdditionalFiles = existingFiles.additional || [];
    if (currentAdditionalFiles.length + files.length > MAX_ADDITIONAL_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_ADDITIONAL_FILES} additional files allowed. Currently have ${currentAdditionalFiles.length}.` },
        { status: 400 }
      );
    }

    // Create case directory if it doesn't exist
    const caseDir = join(UPLOAD_DIR, caseData.caseNumber);
    if (!existsSync(caseDir)) {
      await mkdir(caseDir, { recursive: true });
    }

    const uploadedFiles: string[] = [];
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
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name}: File too large (max 100MB)`);
          continue;
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${caseData.caseNumber}_additional_${timestamp}_${randomStr}_${sanitizedName}`;
        const filePath = join(caseDir, fileName);

        // Save file
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        // Store relative path for database
        const relativePath = `cases/${caseData.caseNumber}/${fileName}`;
        uploadedFiles.push(relativePath);

      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        errors.push(`${file.name}: Upload failed`);
      }
    }

    // Update case with new files
    if (uploadedFiles.length > 0) {
      const updatedFiles = {
        ...existingFiles,
        additional: [...(existingFiles.additional || []), ...uploadedFiles]
      };

      await prisma.case.update({
        where: { id: caseId },
        data: {
          scanFileUrl: JSON.stringify(updatedFiles)
        }
      });

      // Log activity using CaseActivity model
      try {
        await prisma.caseActivity.create({
          data: {
            caseId: caseId,
            userId: session.user.id,
            userName: session.user.name || `${session.user.firstName} ${session.user.lastName}`,
            action: ACTIVITY_TYPE.FILE_UPLOADED,
            details: `Uploaded ${uploadedFiles.length} additional file(s)`,
            metadata: JSON.stringify({ 
              files: uploadedFiles,
              fileNames: files.map(f => f.name)
            })
          }
        });
      } catch (activityError) {
        console.log('Activity logging error:', activityError);
        // Don't fail the upload if activity logging fails
      }
    }

    return NextResponse.json({
      success: true,
      filesUploaded: uploadedFiles.length,
      errors: errors.length > 0 ? errors : undefined,
      uploadedFiles
    });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    );
  }
}