// app/api/cases/[caseId]/files/[fileId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { ACTIVITY_TYPE } from '@dental/shared';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');

// DELETE endpoint for file removal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string; fileId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { caseId, fileId } = await params;
    
    // Only ADMIN and case owner DENTIST can delete files
    const caseData = await prisma.case.findFirst({
      where: {
        id: caseId,
        ...(session.user.role === 'DENTIST' ? { dentistId: session.user.id } : {})
      },
      select: {
        id: true,
        caseNumber: true,
        scanFileUrl: true,
        upperScanFile: true,
        lowerScanFile: true,
        biteScanFile: true
      }
    });

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found or unauthorized' }, { status: 404 });
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'DENTIST') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse existing files
    let scanFiles: any = {};
    if (caseData.scanFileUrl) {
      try {
        scanFiles = JSON.parse(caseData.scanFileUrl);
      } catch (e) {
        console.error('Error parsing scan files:', e);
      }
    }

    // Determine which file to delete
    let fileToDelete: string | null = null;
    let fileType: string = '';
    let updateData: any = {};

    // Check if it's a main scan file
    if (fileId === 'upper' && scanFiles.upper) {
      fileToDelete = scanFiles.upper;
      fileType = 'Upper scan';
      delete scanFiles.upper;
      updateData.upperScanFile = null;
    } else if (fileId === 'lower' && scanFiles.lower) {
      fileToDelete = scanFiles.lower;
      fileType = 'Lower scan';
      delete scanFiles.lower;
      updateData.lowerScanFile = null;
    } else if (fileId === 'bite' && scanFiles.bite) {
      fileToDelete = scanFiles.bite;
      fileType = 'Bite scan';
      delete scanFiles.bite;
      updateData.biteScanFile = null;
    } else if (fileId.startsWith('additional-')) {
      // Handle additional files
      const index = parseInt(fileId.replace('additional-', ''));
      if (scanFiles.additional && scanFiles.additional[index]) {
        fileToDelete = scanFiles.additional[index];
        fileType = `Additional file ${index + 1}`;
        scanFiles.additional.splice(index, 1);
        
        // Clean up empty additional array
        if (scanFiles.additional.length === 0) {
          delete scanFiles.additional;
        }
      }
    }

    if (!fileToDelete) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Delete physical file
    const filePath = join(UPLOAD_DIR, fileToDelete);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }

    // Update database
    updateData.scanFileUrl = JSON.stringify(scanFiles);
    
    await prisma.case.update({
      where: { id: caseId },
      data: updateData
    });

    // Log activity
    await prisma.caseActivity.create({
      data: {
        caseId: caseId,
        userId: session.user.id,
        userName: session.user.name || `${session.user.firstName} ${session.user.lastName}`,
        action: ACTIVITY_TYPE.FILE_DELETED,
        details: `Deleted ${fileType}`,
        metadata: JSON.stringify({ 
          fileId,
          fileName: fileToDelete
        })
      }
    });

    return NextResponse.json({ 
      success: true,
      message: `${fileType} deleted successfully`
    });

  } catch (error) {
    console.error('File deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}

// GET endpoint for file metadata
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string; fileId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { caseId, fileId } = await params;
    
    const caseData = await prisma.case.findFirst({
      where: { id: caseId },
      select: {
        id: true,
        scanFileUrl: true
      }
    });

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Parse files and get metadata
    let scanFiles: any = {};
    if (caseData.scanFileUrl) {
      try {
        scanFiles = JSON.parse(caseData.scanFileUrl);
      } catch (e) {
        return NextResponse.json({ error: 'Invalid file data' }, { status: 500 });
      }
    }

    let fileInfo = null;
    
    if (scanFiles[fileId]) {
      fileInfo = {
        id: fileId,
        path: scanFiles[fileId],
        type: fileId,
        url: `/uploads/${scanFiles[fileId]}`
      };
    } else if (fileId.startsWith('additional-')) {
      const index = parseInt(fileId.replace('additional-', ''));
      if (scanFiles.additional?.[index]) {
        fileInfo = {
          id: fileId,
          path: scanFiles.additional[index],
          type: 'additional',
          index: index,
          url: `/uploads/${scanFiles.additional[index]}`
        };
      }
    }

    if (!fileInfo) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json({ file: fileInfo });

  } catch (error) {
    console.error('File metadata error:', error);
    return NextResponse.json(
      { error: 'Failed to get file metadata' },
      { status: 500 }
    );
  }
}