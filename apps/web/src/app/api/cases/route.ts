// src/app/api/cases/route.ts
import { NextRequest, NextResponse } from "next/server";
import { writeFile, existsSync, mkdirSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { promisify } from "util";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcryptjs from "bcryptjs";
import { prisma } from '@dental/core/infrastructure/prisma/client';
import { 
  USER_ROLES,
  CASE_STATUS,
  SEX_OPTIONS,
  ACTIVITY_TYPE,
  TARGET_TYPE,
  FILE_TYPE,
  FILE_MIME_TYPE,
  NOTIFICATION_TYPE,
  NOTIFICATION_CATEGORY,
  LOG_SEVERITY,
  BUSINESS_RULES,
  validators,
  CASE_STATUS_TRANSITIONS
} from '@shared/constants';
import { BusinessError } from '@dental/core/domain/errors/business.error';

const writeFileAsync = promisify(writeFile);

// Request deduplication cache
interface CacheEntry {
  timestamp: number;
  result: any;
  status: 'pending' | 'completed' | 'error';
  error?: string;
}

const requestCache = new Map<string, CacheEntry>();
const CACHE_TTL = 10000; // 10 seconds

// Clean up old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of requestCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      requestCache.delete(key);
    }
  }
}, 10000);

// Generate caseId as YYMMDD + 3-digit sequence for the day
async function generateCaseNumber(): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  
  // Find the last case created this month
  const lastCase = await prisma.case.findFirst({
    where: {
      caseNumber: {
        startsWith: `${BUSINESS_RULES.CASE_NUMBER_PREFIX}-${year}${month}`
      }
    },
    orderBy: { caseNumber: 'desc' },
    select: { caseNumber: true }
  });
  
  let sequence = 1;
  if (lastCase) {
    // Extract the sequence number from the last case
    const lastSequence = parseInt(lastCase.caseNumber.split('-').pop() || '0');
    sequence = lastSequence + 1;
  }
  
  return `${BUSINESS_RULES.CASE_NUMBER_PREFIX}-${year}${month}-${String(sequence).padStart(4, '0')}`;
}

// Validate file extensions based on file type
function getValidFileExtensions(): string[] {
  return ['.stl', '.obj', '.zip', '.ply'];
}

// Map file extensions to MIME types
function getMimeTypeFromExtension(ext: string): string {
  const mimeMap: Record<string, string> = {
    '.stl': FILE_MIME_TYPE.STL,
    '.obj': FILE_MIME_TYPE.OBJ,
    '.ply': FILE_MIME_TYPE.PLY,
    '.zip': 'application/zip'
  };
  return mimeMap[ext.toLowerCase()] || 'application/octet-stream';
}

// Registration email function
async function sendRegistrationEmail(email: string, token: string, patientName: string, dentistName: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const link = `${baseUrl}/register?token=${token}`;
  
  // In production, use email service
  console.log(`
    ====== REGISTRATION EMAIL ======
    To: ${email}
    Subject: Complete Your Aligner Portal Registration
    
    Dear ${patientName},
    Dr. ${dentistName} has submitted an aligner case for you.
    Please complete your registration to access your case details and track progress.
    Click here to set your password and complete registration:
    ${link}
    This link will expire in 7 days.
    Best regards,
    Aligner Portal Team
    ================================
  `);
}

// GET endpoint - List cases
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Validate user role
    if (!validators.isValidUserRole(session.user.role)) {
      return NextResponse.json({ error: "Invalid user role" }, { status: 400 });
    }
    
    const url = new URL(req.url);
    const dentistId = url.searchParams.get("dentistId");
    const patientId = url.searchParams.get("patientId");
    const reviewerId = url.searchParams.get("reviewerId");
    const manufacturerId = url.searchParams.get("manufacturerId");
    const status = url.searchParams.get("status");
    const archived = url.searchParams.get("archived") === "true";
    
    // Validate status if provided
    if (status && !validators.isValidCaseStatus(status)) {
      return NextResponse.json({ 
        error: "Invalid case status",
        validStatuses: Object.values(CASE_STATUS)
      }, { status: 400 });
    }
    
    let where: any = {};
    
    // Role-based filtering using constants
    switch (session.user.role) {
      case USER_ROLES.DENTIST:
        where.dentistId = session.user.id;
        where.hiddenByDentist = false;
        where.archivedByDentist = archived;
        break;
        
      case USER_ROLES.PATIENT:
        where.patientId = session.user.id;
        if (archived !== undefined) {
          where.archivedByDentist = archived;
        }
        break;
        
      case USER_ROLES.REVIEWER:
        where.OR = [
          { status: CASE_STATUS.PENDING_REVIEW },
          { status: CASE_STATUS.IN_REVIEW },
          { reviewerId: session.user.id }
        ];
        if (archived !== undefined) {
          where.archivedByDentist = archived;
        }
        break;
        
      case USER_ROLES.MANUFACTURER:
        where.OR = [
          { manufacturerId: session.user.id },
          { status: { in: [
            CASE_STATUS.IN_PRODUCTION,
            CASE_STATUS.MANUFACTURING,
            CASE_STATUS.READY_TO_SHIP,
            CASE_STATUS.SHIPPED
          ]}}
        ];
        if (archived !== undefined) {
          where.archivedByDentist = archived;
        }
        break;
        
      case USER_ROLES.ADMIN:
        // Admins can see all cases with optional filters
        if (dentistId) where.dentistId = dentistId;
        if (patientId) where.patientId = patientId;
        if (reviewerId) where.reviewerId = reviewerId;
        if (manufacturerId) where.manufacturerId = manufacturerId;
        if (status) where.status = status;
        where.archivedByDentist = archived;
        break;
        
      default:
        return NextResponse.json({ error: "Invalid role" }, { status: 403 });
    }
    
    const cases = await prisma.case.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
        dentist: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        manufacturer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        appointments: {
          orderBy: { scheduledAt: "asc" },
          take: 1,
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            amount: true,
            currency: true,
            description: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        _count: {
          select: {
            files: true,
            notes: true,
            activities: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });
    
    // Log access for audit
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: ACTIVITY_TYPE.CASE_VIEWED,
        targetType: TARGET_TYPE.CASE,
        description: `Listed ${cases.length} cases`,
        severity: LOG_SEVERITY.INFO,
        metadata: {
          filters: { dentistId, patientId, reviewerId, manufacturerId, status, archived },
          count: cases.length
        }
      }
    }).catch(() => {}); // Don't fail the request if logging fails
    
    const casesWithPayment = cases.map(caseItem => ({
      ...caseItem,
      payment: caseItem.payments?.[0] || null,
    }));
    
    return NextResponse.json({ cases: casesWithPayment });
  } catch (err: any) {
    console.error("API /api/cases GET error:", err);
    
    // Log error
    await prisma.log.create({
      data: {
        userId: session?.user?.id,
        action: ACTIVITY_TYPE.SYSTEM_ERROR,
        targetType: TARGET_TYPE.SYSTEM,
        description: 'Error listing cases',
        severity: LOG_SEVERITY.ERROR,
        errorMessage: err.message,
        errorStack: err.stack,
        metadata: { endpoint: '/api/cases GET' }
      }
    }).catch(() => {});
    
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Global lock for case creation
const caseLocks = new Map<string, Promise<any>>();

// POST: Create new case
export async function POST(req: NextRequest) {
  let requestId: string | null = null;
  let lockKey: string | null = null;
  let tempUploadDir: string | null = null;
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== USER_ROLES.DENTIST) {
      return NextResponse.json({ error: "Unauthorized - Dentists only" }, { status: 401 });
    }
    
    const dentistId = session.user.id;
    const formData = await req.formData();
    
    // Extract patient data
    const patientEmail = (formData.get("patientEmail") as string)?.toLowerCase().trim();
    const patientFirstName = (formData.get("patientFirstName") as string)?.trim();
    const patientLastName = (formData.get("patientLastName") as string)?.trim();
    const phone = (formData.get("phone") as string)?.trim();
    const notes = (formData.get("notes") as string)?.trim();
    const sex = formData.get("sex") as string;
    const dateOfBirthRaw = formData.get("dateOfBirth") as string;
    const providedCaseNumber = (formData.get("caseNumber") as string)?.trim();
    
    // Validate required fields
    if (!patientFirstName || !patientLastName || !patientEmail || !sex || !dateOfBirthRaw) {
      return NextResponse.json({ error: "All patient info is required." }, { status: 400 });
    }
    
    // Validate sex using constants
    if (!validators.isValidSex(sex)) {
      return NextResponse.json({ 
        error: "Invalid sex value",
        validValues: Object.values(SEX_OPTIONS)
      }, { status: 400 });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(patientEmail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirthRaw)) {
      return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });
    }
    const dateOfBirth = new Date(dateOfBirthRaw + 'T00:00:00');
    
    // Extract request ID for deduplication
    requestId = formData.get("requestId") as string || `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    // Create lock key
    lockKey = `${dentistId}-${patientEmail}-${patientFirstName}-${patientLastName}`.toLowerCase();
    
    // Check for existing request
    if (caseLocks.has(lockKey)) {
      console.log(`Waiting for existing request with lockKey: ${lockKey}`);
      try {
        const existingResult = await caseLocks.get(lockKey);
        return NextResponse.json(existingResult);
      } catch (existingError: any) {
        console.log(`Existing request failed for lockKey: ${lockKey}, retrying...`);
      }
    }
    
    // Check cache
    const cached = requestCache.get(requestId);
    if (cached && cached.status === 'completed' && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`Returning cached response for requestId: ${requestId}`);
      return NextResponse.json(cached.result);
    }
    
    // Create lock promise
    let resolveLock: ((value: any) => void) | null = null;
    let rejectLock: ((reason?: any) => void) | null = null;
    
    const lockPromise = new Promise((resolve, reject) => {
      resolveLock = resolve;
      rejectLock = reject;
    });
    
    caseLocks.set(lockKey, lockPromise);
    requestCache.set(requestId, {
      timestamp: Date.now(),
      status: 'pending',
      result: null
    });
    
    // Process files
    const baseUploadDir = path.join(process.cwd(), "public", "uploads");
    tempUploadDir = path.join(baseUploadDir, "temp", requestId);
    
    // Ensure directories exist
    if (!existsSync(path.join(baseUploadDir, "temp"))) {
      mkdirSync(path.join(baseUploadDir, "temp"), { recursive: true });
    }
    if (!existsSync(tempUploadDir)) {
      mkdirSync(tempUploadDir, { recursive: true });
    }
    
    // File upload handling
    const fileFields = [
      { name: "upper", type: FILE_TYPE.UPPER_SCAN },
      { name: "lower", type: FILE_TYPE.LOWER_SCAN },
      { name: "bite", type: FILE_TYPE.BITE_SCAN }
    ];
    
    const tempFiles: Record<string, { path: string; ext: string; type: string }> = {};
    const allowedExtensions = getValidFileExtensions();
    
    // Process main scan files
    for (const field of fileFields) {
      const file = formData.get(field.name) as File;
      
      if (file && file.name && file.size > 0) {
        const fileExt = path.extname(file.name).toLowerCase();
        
        if (!allowedExtensions.includes(fileExt)) {
          const error = `File type ${fileExt} not allowed for ${field.name}`;
          if (rejectLock) rejectLock(new Error(error));
          caseLocks.delete(lockKey);
          requestCache.delete(requestId);
          return NextResponse.json({ 
            error,
            allowedTypes: allowedExtensions 
          }, { status: 400 });
        }
        
        // Check file size
        const maxSizeBytes = BUSINESS_RULES.MAX_FILE_SIZE_MB * 1024 * 1024;
        if (file.size > maxSizeBytes) {
          const error = `File size exceeds ${BUSINESS_RULES.MAX_FILE_SIZE_MB}MB limit`;
          if (rejectLock) rejectLock(new Error(error));
          caseLocks.delete(lockKey);
          requestCache.delete(requestId);
          return NextResponse.json({ error }, { status: 400 });
        }
        
        // Save to temp directory
        const tempFileName = `${field.name}_temp_${Date.now()}${fileExt}`;
        const tempFilePath = path.join(tempUploadDir, tempFileName);
        
        const arrayBuffer = await file.arrayBuffer();
        await writeFileAsync(tempFilePath, Buffer.from(arrayBuffer));
        
        tempFiles[field.name] = { 
          path: tempFilePath, 
          ext: fileExt,
          type: field.type
        };
      }
    }
    
    // Check minimum files requirement
    const uploadedMainFiles = Object.keys(tempFiles).length;
    if (uploadedMainFiles < BUSINESS_RULES.MIN_CASE_FILES) {
      const error = `At least ${BUSINESS_RULES.MIN_CASE_FILES} scan files are required. Only ${uploadedMainFiles} provided.`;
      if (rejectLock) rejectLock(new Error(error));
      caseLocks.delete(lockKey);
      requestCache.delete(requestId);
      
      // Clean up temp files
      try {
        const fs = require('fs').promises;
        await fs.rmdir(tempUploadDir, { recursive: true });
      } catch {}
      
      return NextResponse.json({ error }, { status: 400 });
    }
    
    // Process additional files
    const tempAdditionalFiles: { path: string; ext: string; originalName: string }[] = [];
    let additionalIndex = 0;
    
    while (formData.has(`additional_${additionalIndex}`)) {
      const file = formData.get(`additional_${additionalIndex}`) as File;
      if (file && file.name && file.size > 0) {
        const fileExt = path.extname(file.name).toLowerCase();
        
        if (!allowedExtensions.includes(fileExt)) {
          const error = `File type ${fileExt} not allowed for additional file`;
          if (rejectLock) rejectLock(new Error(error));
          caseLocks.delete(lockKey);
          requestCache.delete(requestId);
          return NextResponse.json({ error }, { status: 400 });
        }
        
        const tempFileName = `additional_${additionalIndex}_temp_${Date.now()}${fileExt}`;
        const tempFilePath = path.join(tempUploadDir, tempFileName);
        
        const arrayBuffer = await file.arrayBuffer();
        await writeFileAsync(tempFilePath, Buffer.from(arrayBuffer));
        
        tempAdditionalFiles.push({ 
          path: tempFilePath, 
          ext: fileExt,
          originalName: file.name
        });
      }
      additionalIndex++;
    }
    
    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Generate case number
      let finalCaseNumber: string;
      
      if (providedCaseNumber) {
        // Validate format
        if (!providedCaseNumber.startsWith(BUSINESS_RULES.CASE_NUMBER_PREFIX)) {
          throw new BusinessError(`Case number must start with ${BUSINESS_RULES.CASE_NUMBER_PREFIX}`);
        }
        
        // Check uniqueness
        const existingCase = await tx.case.findUnique({
          where: { caseNumber: providedCaseNumber },
          select: { id: true }
        });
        
        if (existingCase) {
          throw new BusinessError(`Case number ${providedCaseNumber} already exists`);
        }
        
        finalCaseNumber = providedCaseNumber;
      } else {
        finalCaseNumber = await generateCaseNumber();
      }
      
      // Create case directory
      const caseUploadDir = path.join(baseUploadDir, "cases", finalCaseNumber);
      if (!existsSync(path.join(baseUploadDir, "cases"))) {
        mkdirSync(path.join(baseUploadDir, "cases"), { recursive: true });
      }
      if (!existsSync(caseUploadDir)) {
        mkdirSync(caseUploadDir, { recursive: true });
      }
      
      // Move files from temp to final location
      const fs = require('fs').promises;
      const fileRecords: any[] = [];
      
      // Move main scan files
      for (const [name, tempFile] of Object.entries(tempFiles)) {
        const fileName = `${finalCaseNumber}_${name}_${Date.now()}${tempFile.ext}`;
        const finalPath = path.join(caseUploadDir, fileName);
        
        await fs.rename(tempFile.path, finalPath);
        
        fileRecords.push({
          type: tempFile.type,
          fileName: fileName,
          originalName: `${name}_scan${tempFile.ext}`,
          fileUrl: `/uploads/cases/${finalCaseNumber}/${fileName}`,
          fileSize: (await fs.stat(finalPath)).size,
          mimeType: getMimeTypeFromExtension(tempFile.ext),
          isPublic: false
        });
      }
      
      // Move additional files
      for (let i = 0; i < tempAdditionalFiles.length; i++) {
        const tempFile = tempAdditionalFiles[i];
        const fileName = `${finalCaseNumber}_additional_${i}_${Date.now()}${tempFile.ext}`;
        const finalPath = path.join(caseUploadDir, fileName);
        
        await fs.rename(tempFile.path, finalPath);
        
        fileRecords.push({
          type: FILE_TYPE.OTHER,
          fileName: fileName,
          originalName: tempFile.originalName,
          fileUrl: `/uploads/cases/${finalCaseNumber}/${fileName}`,
          fileSize: (await fs.stat(finalPath)).size,
          mimeType: getMimeTypeFromExtension(tempFile.ext),
          isPublic: false
        });
      }
      
      // Clean up temp directory
      try {
        await fs.rmdir(tempUploadDir, { recursive: true });
      } catch {}
      
      // Find or create patient
      let patient = await tx.user.findUnique({ 
        where: { email: patientEmail } 
      });
      
      let emailVerificationCode: string | null = null;
      let newPatientInvited = false;
      
      if (!patient) {
        // Generate verification code
        emailVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const tempPassword = uuidv4();
        const hashedTempPassword = await bcryptjs.hash(tempPassword, 12);
        
        // Create new patient
        patient = await tx.user.create({
          data: {
            firstName: patientFirstName,
            lastName: patientLastName,
            email: patientEmail,
            password: hashedTempPassword,
            phone: phone || null,
            role: USER_ROLES.PATIENT,
            sex,
            dateOfBirth,
            isVerified: false,
            isActive: true,
            emailVerificationCode,
            verificationMethod: 'EMAIL',
            profileCompleted: false,
            
            // Create default preferences
            preferences: {
              create: {
                emailNotifications: true,
                smsNotifications: !!phone,
                appointmentReminders: true,
                caseUpdateAlerts: true,
                marketingEmails: false,
                language: BUSINESS_RULES.DEFAULT_LANGUAGE,
                timezone: BUSINESS_RULES.DEFAULT_TIMEZONE,
                dateFormat: 'MM/DD/YYYY',
                timeFormat: '12h'
              }
            }
          },
        });
        newPatientInvited = true;
        
        // Log user creation
        await tx.log.create({
          data: {
            userId: dentistId,
            action: ACTIVITY_TYPE.USER_CREATED,
            targetType: TARGET_TYPE.USER,
            targetId: patient.id,
            description: `Patient account created for ${patient.firstName} ${patient.lastName}`,
            severity: LOG_SEVERITY.INFO,
            metadata: {
              createdBy: 'case_creation',
              patientEmail: patientEmail
            }
          }
        });
      } else {
        // Update existing patient if needed
        const updateData: any = {};
        if (!patient.firstName && patientFirstName) updateData.firstName = patientFirstName;
        if (!patient.lastName && patientLastName) updateData.lastName = patientLastName;
        if (!patient.sex && sex) updateData.sex = sex;
        if (!patient.dateOfBirth && dateOfBirth) updateData.dateOfBirth = dateOfBirth;
        if (!patient.phone && phone) updateData.phone = phone;
        
        if (Object.keys(updateData).length > 0) {
          patient = await tx.user.update({
            where: { id: patient.id },
            data: updateData,
          });
        }
      }
      
      // Get dentist details
      const dentist = await tx.user.findUnique({ 
        where: { id: dentistId },
        select: { id: true, firstName: true, lastName: true, email: true }
      });
      
      if (!dentist) {
        throw new BusinessError("Dentist does not exist.");
      }
      
      // Create the case
      const newCase = await tx.case.create({
        data: {
          caseNumber: finalCaseNumber,
          patientId: patient.id,
          dentistId: dentist.id,
          type: formData.get("caseType") as string || CASE_TYPE.ALIGNER,
          treatmentType: formData.get("treatmentType") as string || TREATMENT_TYPE.STANDARD,
          status: CASE_STATUS.NEW,
          priority: formData.get("priority") as string || CASE_PRIORITY.NORMAL,
          description: notes || `New case for ${patient.firstName} ${patient.lastName}`,
          chiefComplaint: formData.get("chiefComplaint") as string,
          requiresConsent: true,
          hiddenByDentist: false,
          archivedByDentist: false,
          
          // Create files
          files: {
            create: fileRecords.map(file => ({
              ...file,
              uploadedById: dentistId
            }))
          }
        },
        include: {
          files: true
        }
      });
      
      // Create notifications
      await tx.notification.createMany({
        data: [
          {
            userId: patient.id,
            title: 'New Case Created',
            message: `Dr. ${dentist.firstName} ${dentist.lastName} has submitted a new aligner case for you. Case #${finalCaseNumber}`,
            type: NOTIFICATION_TYPE.CASE_UPDATE,
            category: NOTIFICATION_CATEGORY.CASE,
            relatedEntityId: newCase.id,
            relatedEntityType: TARGET_TYPE.CASE,
            actionUrl: `/cases/${newCase.id}`,
            actionLabel: 'View Case'
          },
          ...(newPatientInvited ? [{
            userId: patient.id,
            title: 'Complete Your Registration',
            message: 'Please verify your email and set up your password to access your case.',
            type: NOTIFICATION_TYPE.INFO,
            category: NOTIFICATION_CATEGORY.USER,
            actionUrl: '/verify',
            actionLabel: 'Verify Account'
          }] : [])
        ]
      });
      
      // Log case creation
      await tx.log.create({
        data: {
          userId: dentist.id,
          action: ACTIVITY_TYPE.CASE_CREATED,
          targetType: TARGET_TYPE.CASE,
          targetId: newCase.id,
          description: `Case ${finalCaseNumber} created for patient ${patient.firstName} ${patient.lastName}`,
          severity: LOG_SEVERITY.INFO,
          metadata: {
            caseNumber: finalCaseNumber,
            patientName: `${patient.firstName} ${patient.lastName}`,
            patientId: patient.id,
            filesUploaded: fileRecords.length,
            newPatient: newPatientInvited
          }
        }
      });
      
      // Create case activity
      await tx.caseActivity.create({
        data: {
          caseId: newCase.id,
          userId: dentist.id,
          action: ACTIVITY_TYPE.CASE_CREATED,
          details: `Case created for patient ${patient.firstName} ${patient.lastName}`,
          metadata: {
            filesUploaded: fileRecords.length,
            caseType: newCase.type,
            priority: newCase.priority
          }
        }
      });
      
      return {
        newCase,
        patient,
        dentist,
        newPatientInvited,
        emailVerificationCode,
        finalCaseNumber
      };
    }, {
      timeout: 30000,
    });
    
    // Send registration email if new patient
    if (result.newPatientInvited && result.emailVerificationCode) {
      await sendRegistrationEmail(
        patientEmail, 
        result.emailVerificationCode, 
        `${patientFirstName} ${patientLastName}`,
        `${result.dentist.firstName} ${result.dentist.lastName}`
      );
    }
    
    const response = {
      success: true,
      caseId: result.newCase.id,
      caseNumber: result.finalCaseNumber,
      patientId: result.patient.id,
      patientInvited: result.newPatientInvited,
    };
    
    // Update cache
    if (requestId) {
      requestCache.set(requestId, {
        timestamp: Date.now(),
        result: response,
        status: 'completed'
      });
    }
    
    // Resolve lock
    if (resolveLock) {
      resolveLock(response);
    }
    
    // Clean up lock after delay
    setTimeout(() => {
      caseLocks.delete(lockKey);
    }, 1000);
    
    return NextResponse.json(response);
    
  } catch (err: any) {
    console.error("API /api/cases POST error:", err);
    
    // Log error
    await prisma.log.create({
      data: {
        userId: session?.user?.id,
        action: ACTIVITY_TYPE.SYSTEM_ERROR,
        targetType: TARGET_TYPE.SYSTEM,
        description: 'Error creating case',
        severity: LOG_SEVERITY.ERROR,
        errorMessage: err.message,
        errorStack: err.stack,
        metadata: { 
          endpoint: '/api/cases POST',
          lockKey,
          requestId
        }
      }
    }).catch(() => {});
    
    // Update cache with error
    if (requestId) {
      requestCache.set(requestId, {
        timestamp: Date.now(),
        result: null,
        status: 'error',
        error: err.message || 'Internal server error'
      });
    }
    
    // Clean up lock
    if (lockKey) {
      caseLocks.delete(lockKey);
    }
    
    // Clean up temp directory if it exists
    if (tempUploadDir) {
      try {
        const fs = require('fs').promises;
        await fs.rmdir(tempUploadDir, { recursive: true });
      } catch {}
    }
    
    // Handle specific errors
    if (err instanceof BusinessError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    
    if (err.name === 'ValidationError') {
      return NextResponse.json({ 
        error: err.message,
        field: err.field,
        validValues: err.validValues
      }, { status: 400 });
    }
    
    if (err.code === 'P2002' || err.message?.includes('Unique constraint failed')) {
      return NextResponse.json({ 
        error: "A case with this number already exists. Please try again." 
      }, { status: 409 });
    }
    
    return NextResponse.json({ 
      error: err.message || "Internal server error" 
    }, { status: 500 });
  }
}