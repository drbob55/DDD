import { prisma } from "@/lib/prisma";
import { ROLES, CASE_STATUS, PAYMENT_STATUS, SEX_OPTIONS } from "@/lib/constants";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { writeFile, existsSync, mkdirSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { promisify } from "util";

export async function POST(
  req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== ROLES.DENTIST) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const caseId = params.caseId;
    const formData = await req.formData();
    
    // Verify case exists and belongs to dentist
    const existingCase = await prisma.case.findUnique({
      where: { id: caseId },
      include: { patient: true },
    });
    
    if (!existingCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    
    if (existingCase.dentistId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized - not your case" }, { status: 401 });
    }
    
    // Parse existing files
    let existingFiles: any = {};
    try {
      existingFiles = JSON.parse(existingCase.scanFileUrl);
    } catch {
      existingFiles = {};
    }
    
    // Upload directory
    const uploadDir = path.join(process.cwd(), "uploads");
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
    
    // Process uploaded files
    const uploadedFiles: string[] = [];
    const files = formData.getAll("files");
    
    for (const file of files) {
      if (file instanceof File && file.name) {
        const fileExt = path.extname(file.name).toLowerCase();
        const allowedExtensions = [".stl", ".obj", ".zip", ".ply"];
        
        if (!allowedExtensions.includes(fileExt)) {
          continue; // Skip invalid file types
        }
        
        const safeName = `${existingCase.patientId}_additional_${uuidv4()}${fileExt}`;
        const filePath = path.join(uploadDir, safeName);
        
        const arrayBuffer = await file.arrayBuffer();
        await promisify(writeFile)(filePath, Buffer.from(arrayBuffer));
        
        uploadedFiles.push(safeName);
      }
    }
    
    if (uploadedFiles.length === 0) {
      return NextResponse.json({ error: "No valid files uploaded" }, { status: 400 });
    }
    
    // Update case with new files
    const updatedFiles = {
      ...existingFiles,
      additional: [
        ...(existingFiles.additional || []),
        ...uploadedFiles
      ]
    };
    
    await prisma.case.update({
      where: { id: caseId },
      data: {
        scanFileUrl: JSON.stringify(updatedFiles),
      },
    });
    
    // Log the action
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: "ADDITIONAL_FILES_UPLOADED",
        targetType: "CASE",
        targetId: caseId,
        details: `${uploadedFiles.length} additional file(s) uploaded to case ${caseId}`,
      },
    });
    
    // Create notification for reviewer if assigned
    if (existingCase.reviewerId) {
      await prisma.notification.create({
        data: {
          userId: existingCase.reviewerId,
          message: `Additional files uploaded for case ${caseId}`,
        },
      });
    }
    
    return NextResponse.json({
      success: true,
      filesUploaded: uploadedFiles.length,
      message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
    });
    
  } catch (err: any) {
    console.error("File upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET: List all files for a case
export async function GET(
  req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const caseId = params.caseId;
    
    // Get case
    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
    });
    
    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    
    // Check permissions
    const canView = 
      session.user.role === ROLES.ADMIN ||
      (session.user.role === ROLES.DENTIST && caseRecord.dentistId === session.user.id) ||
      (session.user.role === ROLES.PATIENT && caseRecord.patientId === session.user.id) ||
      (session.user.role === ROLES.REVIEWER && caseRecord.reviewerId === session.user.id);
    
    if (!canView) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Parse files
    let files = {};
    try {
      files = JSON.parse(caseRecord.scanFileUrl);
    } catch {
      files = {};
    }
    
    return NextResponse.json({ files });
  } catch (err: any) {
    console.error("Get files error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}