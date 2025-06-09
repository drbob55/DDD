// src/app/api/cases/route.ts
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, existsSync, mkdirSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { promisify } from "util";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcryptjs from "bcryptjs";
import { 
  ROLES, 
  CASE_STATUS, 
  SEX_OPTIONS, 
  ACTIVITY_TYPE,
  TARGET_TYPE,
  isValidSex 
} from "@/lib/constants";

const writeFileAsync = promisify(writeFile);

// Request deduplication cache with better structure
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

// Generate unique 8-digit patient ID (numeric string)
async function generateUniquePatientId() {
  let userId: string;
  let exists = true;
  let attempts = 0;
  const maxAttempts = 100;
  
  do {
    userId = (Math.floor(10000000 + Math.random() * 90000000)).toString();
    exists = !!(await prisma.user.findUnique({ where: { userId } }));
    attempts++;
    
    if (attempts >= maxAttempts) {
      throw new Error('Unable to generate unique patient ID');
    }
  } while (exists);
  
  return userId;
}

// Generate caseId as YYMMDD + 3-digit sequence for the day
async function generateCaseId() {
  const today = new Date();
  const pad = (n: number, len: number = 2) => n.toString().padStart(len, '0');
  const dd = pad(today.getDate());
  const mm = pad(today.getMonth() + 1);
  const yy = today.getFullYear().toString().slice(-2);
  const todayPrefix = `${yy}${mm}${dd}`;
  
  // Count today's cases
  const todayCases = await prisma.case.count({
    where: { id: { startsWith: todayPrefix } }
  });
  
  const nextNumber = todayCases + 1;
  const suffix = nextNumber.toString().padStart(3, '0');
  return `${todayPrefix}${suffix}`;
}

// Ultra-robust case number generation
async function generateCaseNumber(): Promise<string> {
  const maxRetries = 100;
  let attempts = 0;
  
  while (attempts < maxRetries) {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    // Use more entropy for uniqueness
    const timestamp = Date.now();
    const timestampHex = timestamp.toString(36).slice(-4); // Base36 for more entropy
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    const processId = process.pid ? process.pid.toString().slice(-2) : '00';
    
    // Create case number with format: YYMMDD-TTRRRPP
    const unique = `${timestampHex.slice(-2)}${random.slice(-3)}${processId}`;
    const caseNumber = `${year}${month}${day}-${unique}`;
    
    try {
      // Check if this case number already exists
      const exists = await prisma.case.findUnique({
        where: { caseNumber },
        select: { id: true }
      });
      
      if (!exists) {
        // Double-check with a small delay
        await new Promise(resolve => setTimeout(resolve, 10));
        const doubleCheck = await prisma.case.findUnique({
          where: { caseNumber },
          select: { id: true }
        });
        
        if (!doubleCheck) {
          return caseNumber;
        }
      }
    } catch (error) {
      console.error('Error checking case number existence:', error);
    }
    
    attempts++;
    // Exponential backoff with jitter
    const backoffMs = Math.min(50 * Math.pow(1.5, attempts / 10), 2000) + Math.random() * 100;
    await new Promise(resolve => setTimeout(resolve, backoffMs));
  }
  
  // Last resort: use full UUID
  const uuid = uuidv4();
  const today = new Date();
  const fallback = `${today.getFullYear().toString().slice(-2)}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${uuid.slice(0, 8)}`;
  
  return fallback;
}

// Registration email function
async function sendRegistrationEmail(email: string, token: string, patientName: string, dentistName: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const link = `${baseUrl}/register?token=${token}`;
  
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

// GET endpoint remains the same...
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const url = new URL(req.url);
    const dentistId = url.searchParams.get("dentistId");
    const patientId = url.searchParams.get("patientId");
    const reviewerId = url.searchParams.get("reviewerId");
    const manufacturerId = url.searchParams.get("manufacturerId");
    const status = url.searchParams.get("status");
    const archived = url.searchParams.get("archived") === "true";
    
    let where: any = {};
    
    // Role-based filtering
    if (session.user.role === ROLES.DENTIST) {
      where.dentistId = session.user.id;
      where.hiddenByDentist = false;
      where.archivedByDentist = archived;
    } else if (session.user.role === ROLES.PATIENT) {
      where.patientId = session.user.id;
      if (archived !== undefined) {
        where.archivedByDentist = archived;
      }
    } else if (session.user.role === ROLES.REVIEWER) {
      where.OR = [
        { status: CASE_STATUS.PENDING_REVIEW },
        { reviewerId: session.user.id }
      ];
      if (archived !== undefined) {
        where.archivedByDentist = archived;
      }
    } else if (session.user.role === ROLES.MANUFACTURER) {
      where.manufacturerId = session.user.id;
      where.status = { in: [CASE_STATUS.MANUFACTURING, CASE_STATUS.SHIPPED, CASE_STATUS.COMPLETED] };
      if (archived !== undefined) {
        where.archivedByDentist = archived;
      }
    } else if (session.user.role === ROLES.ADMIN) {
      if (dentistId) where.dentistId = dentistId;
      if (patientId) where.patientId = patientId;
      if (reviewerId) where.reviewerId = reviewerId;
      if (manufacturerId) where.manufacturerId = manufacturerId;
      if (status) where.status = status;
      where.archivedByDentist = archived;
    } else {
      return NextResponse.json({ error: "Invalid role" }, { status: 403 });
    }
    
    const cases = await prisma.case.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
        dentist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        manufacturer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        appointments: {
          orderBy: { date: "asc" },
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
      },
      orderBy: { createdAt: "desc" },
    });
    
    const casesWithPayment = cases.map(caseItem => ({
      ...caseItem,
      payment: caseItem.payments?.[0] || null,
    }));
    
    return NextResponse.json({ cases: casesWithPayment });
  } catch (err: any) {
    console.error("API /api/cases GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Global lock for case creation to prevent race conditions
const caseLocks = new Map<string, Promise<any>>();

// POST: Create new case with proper synchronization
export async function POST(req: NextRequest) {
  let requestId: string | null = null;
  let lockKey: string | null = null;
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== ROLES.DENTIST) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const dentistId = session.user.id;
    const formData = await req.formData();
    
    // Extract key data for deduplication
    const patientEmail = (formData.get("patientEmail") as string)?.toLowerCase();
    const patientFirstName = (formData.get("patientFirstName") as string)?.trim();
    const patientLastName = (formData.get("patientLastName") as string)?.trim();
    
    // Extract request ID for deduplication
    requestId = formData.get("requestId") as string;
    
    // Create a lock key based on dentist and patient info
    lockKey = `${dentistId}-${patientEmail}-${patientFirstName}-${patientLastName}`.toLowerCase();
    
    // If no requestId provided, use the lock key
    if (!requestId) {
      requestId = `${lockKey}-${Date.now()}`;
    }
    
    // Check if we're already processing a request for this exact case
    if (caseLocks.has(lockKey)) {
      console.log(`Waiting for existing request with lockKey: ${lockKey}`);
      try {
        // Wait for the existing request to complete
        const existingResult = await caseLocks.get(lockKey);
        console.log(`Returning result from existing request for lockKey: ${lockKey}`);
        return NextResponse.json(existingResult);
      } catch (existingError: any) {
        // If the existing request failed, we'll try again
        console.log(`Existing request failed for lockKey: ${lockKey}, retrying...`);
      }
    }
    
    // Check request cache as well
    const cached = requestCache.get(requestId);
    if (cached && cached.status === 'completed' && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`Returning cached response for requestId: ${requestId}`);
      return NextResponse.json(cached.result);
    }
    
    // Create a promise that will be resolved when this request completes
    let resolvelock: ((value: any) => void) | null = null;
    let rejectLock: ((reason?: any) => void) | null = null;
    
    const lockPromise = new Promise((resolve, reject) => {
      resolvelock = resolve;
      rejectLock = reject;
    });
    
    // Set the lock
    caseLocks.set(lockKey, lockPromise);
    
    // Mark this request as pending in cache
    requestCache.set(requestId, {
      timestamp: Date.now(),
      status: 'pending',
      result: null
    });
    
    // Extract all form data
    const phone = (formData.get("phone") as string)?.trim();
    const notes = (formData.get("notes") as string)?.trim();
    const sex = formData.get("sex") as string;
    const dateOfBirthRaw = formData.get("dateOfBirth") as string;
    const providedCaseNumber = (formData.get("caseNumber") as string)?.trim();
    
    // Validate patient info
    if (!patientFirstName || !patientLastName || !patientEmail || !sex || !dateOfBirthRaw) {
      const error = "All patient info is required.";
      if (rejectLock) rejectLock(new Error(error));
      caseLocks.delete(lockKey);
      requestCache.delete(requestId);
      return NextResponse.json({ error }, { status: 400 });
    }
    
    if (!isValidSex(sex)) {
      const error = "Invalid sex value";
      if (rejectLock) rejectLock(new Error(error));
      caseLocks.delete(lockKey);
      requestCache.delete(requestId);
      return NextResponse.json({ error }, { status: 400 });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(patientEmail)) {
      const error = "Invalid email format";
      if (rejectLock) rejectLock(new Error(error));
      caseLocks.delete(lockKey);
      requestCache.delete(requestId);
      return NextResponse.json({ error }, { status: 400 });
    }
    
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirthRaw)) {
      const error = "Invalid date format. Use YYYY-MM-DD.";
      if (rejectLock) rejectLock(new Error(error));
      caseLocks.delete(lockKey);
      requestCache.delete(requestId);
      return NextResponse.json({ error }, { status: 400 });
    }
    const dateOfBirth = new Date(dateOfBirthRaw + 'T00:00:00');
    
    // Process files before the transaction
    const baseUploadDir = path.join(process.cwd(), "public", "uploads");
    const tempUploadDir = path.join(baseUploadDir, "temp", requestId);
    
    // Ensure temp directory exists
    if (!existsSync(path.join(baseUploadDir, "temp"))) {
      mkdirSync(path.join(baseUploadDir, "temp"), { recursive: true });
    }
    if (!existsSync(tempUploadDir)) {
      mkdirSync(tempUploadDir, { recursive: true });
    }
    
    // File upload handling
    const fileFields = [
      { name: "upper", type: "upper" },
      { name: "lower", type: "lower" },
      { name: "bite", type: "bite" }
    ];
    
    const tempFiles: Record<string, { path: string; ext: string }> = {};
    
    // Process main scan files to temp directory first
    for (const field of fileFields) {
      const file = formData.get(field.name) as File;
      
      if (file && file.name && file.size > 0) {
        const fileExt = path.extname(file.name).toLowerCase();
        const allowedExtensions = [".stl", ".obj", ".zip", ".ply"];
        if (!allowedExtensions.includes(fileExt)) {
          const error = `File type ${fileExt} not allowed for ${field.type}`;
          if (rejectLock) rejectLock(new Error(error));
          caseLocks.delete(lockKey);
          requestCache.delete(requestId);
          return NextResponse.json({ error }, { status: 400 });
        }
        
        // Save to temp directory
        const tempFileName = `${field.type}_temp_${Date.now()}${fileExt}`;
        const tempFilePath = path.join(tempUploadDir, tempFileName);
        
        const arrayBuffer = await file.arrayBuffer();
        await writeFileAsync(tempFilePath, Buffer.from(arrayBuffer));
        
        tempFiles[field.type] = { path: tempFilePath, ext: fileExt };
      }
    }
    
    // Handle additional files
    const tempAdditionalFiles: { path: string; ext: string }[] = [];
    let additionalIndex = 0;
    while (formData.has(`additional_${additionalIndex}`)) {
      const file = formData.get(`additional_${additionalIndex}`) as File;
      if (file && file.name && file.size > 0) {
        const fileExt = path.extname(file.name).toLowerCase();
        const allowedExtensions = [".stl", ".obj", ".zip", ".ply"];
        if (!allowedExtensions.includes(fileExt)) {
          const error = `File type ${fileExt} not allowed for additional file`;
          if (rejectLock) rejectLock(new Error(error));
          caseLocks.delete(lockKey);
          requestCache.delete(requestId);
          return NextResponse.json({ error }, { status: 400 });
        }
        
        // Save to temp directory
        const tempFileName = `additional_${additionalIndex}_temp_${Date.now()}${fileExt}`;
        const tempFilePath = path.join(tempUploadDir, tempFileName);
        
        const arrayBuffer = await file.arrayBuffer();
        await writeFileAsync(tempFilePath, Buffer.from(arrayBuffer));
        
        tempAdditionalFiles.push({ path: tempFilePath, ext: fileExt });
      }
      additionalIndex++;
    }
    
    // Check if at least one file was uploaded
    if (!tempFiles.upper && !tempFiles.lower && !tempFiles.bite) {
      const error = "At least one scan file is required.";
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
    
    // Use a transaction with explicit locking
    const result = await prisma.$transaction(async (tx) => {
      // Generate unique case number
      let finalCaseNumber: string;
      let caseId: string;
      
      if (providedCaseNumber) {
        // Check if provided case number already exists
        const existingCase = await tx.case.findUnique({
          where: { caseNumber: providedCaseNumber },
          select: { id: true }
        });
        
        if (existingCase) {
          throw new Error(`Case number ${providedCaseNumber} already exists`);
        }
        
        finalCaseNumber = providedCaseNumber;
      } else {
        // Generate new case number with better uniqueness
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const today = new Date();
        const year = today.getFullYear().toString().slice(-2);
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        
        // Include milliseconds for better uniqueness
        const ms = timestamp.toString().slice(-3);
        finalCaseNumber = `${year}${month}${day}-${random}${ms}`;
        
        // Verify uniqueness
        let attempts = 0;
        while (attempts < 10) {
          const existingCase = await tx.case.findUnique({
            where: { caseNumber: finalCaseNumber },
            select: { id: true }
          });
          
          if (!existingCase) {
            break;
          }
          
          // Generate a new one
          const newRandom = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
          const newMs = Date.now().toString().slice(-4);
          finalCaseNumber = `${year}${month}${day}-${newRandom}${newMs}`;
          attempts++;
        }
        
        if (attempts >= 10) {
          // Use UUID as last resort
          const uuid = uuidv4().replace(/-/g, '').slice(0, 10);
          finalCaseNumber = `${year}${month}${day}-${uuid}`;
        }
      }
      
      caseId = await generateCaseId();
      
      // Now create the case-specific directory with the final case number
      const caseUploadDir = path.join(baseUploadDir, "cases", finalCaseNumber);
      if (!existsSync(path.join(baseUploadDir, "cases"))) {
        mkdirSync(path.join(baseUploadDir, "cases"), { recursive: true });
      }
      if (!existsSync(caseUploadDir)) {
        mkdirSync(caseUploadDir, { recursive: true });
      }
      
      // Move files from temp to final location
      const fs = require('fs').promises;
      const allFiles: Record<string, string | string[]> = {};
      let upperScanFile: string | null = null;
      let lowerScanFile: string | null = null;
      let biteScanFile: string | null = null;
      
      // Move main scan files
      for (const [type, tempFile] of Object.entries(tempFiles)) {
        const fileName = `${finalCaseNumber}_${type}_${Date.now()}${tempFile.ext}`;
        const finalPath = path.join(caseUploadDir, fileName);
        
        // Move file from temp to final location
        await fs.rename(tempFile.path, finalPath);
        
        const relativePath = `cases/${finalCaseNumber}/${fileName}`;
        allFiles[type] = relativePath;
        
        if (type === 'upper') upperScanFile = relativePath;
        else if (type === 'lower') lowerScanFile = relativePath;
        else if (type === 'bite') biteScanFile = relativePath;
      }
      
      // Move additional files
      const additionalFiles: string[] = [];
      for (let i = 0; i < tempAdditionalFiles.length; i++) {
        const tempFile = tempAdditionalFiles[i];
        const fileName = `${finalCaseNumber}_additional_${i}_${Date.now()}${tempFile.ext}`;
        const finalPath = path.join(caseUploadDir, fileName);
        
        await fs.rename(tempFile.path, finalPath);
        
        const relativePath = `cases/${finalCaseNumber}/${fileName}`;
        additionalFiles.push(relativePath);
      }
      
      if (additionalFiles.length > 0) {
        allFiles.additional = additionalFiles;
      }
      
      // Clean up temp directory
      try {
        await fs.rmdir(tempUploadDir, { recursive: true });
      } catch {}
      
      // Store all files in scanFileUrl as JSON
      const scanFileUrl = JSON.stringify(allFiles);
      
      // Find or create patient
      let patient = await tx.user.findUnique({ where: { email: patientEmail } });
      let patientUserId: string;
      let emailVerificationCode: string | null = null;
      let newPatientInvited = false;
      
      if (!patient) {
        patientUserId = await generateUniquePatientId();
        emailVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const tempPassword = uuidv4();
        const hashedTempPassword = await bcryptjs.hash(tempPassword, 12);
        
        patient = await tx.user.create({
          data: {
            userId: patientUserId,
            name: `${patientFirstName} ${patientLastName}`,
            firstName: patientFirstName,
            lastName: patientLastName,
            email: patientEmail,
            password: hashedTempPassword,
            phone: phone || null,
            role: ROLES.PATIENT,
            sex,
            dateOfBirth,
            isVerified: false,
            emailVerificationCode,
            verificationMethod: "email",
          },
        });
        newPatientInvited = true;
      } else {
        // Update existing patient if needed
        const updateData: any = {};
        if (!patient.firstName && patientFirstName) updateData.firstName = patientFirstName;
        if (!patient.lastName && patientLastName) updateData.lastName = patientLastName;
        if (!patient.sex && sex) updateData.sex = sex;
        if (!patient.dateOfBirth && dateOfBirth) updateData.dateOfBirth = dateOfBirth;
        if (!patient.phone && phone) updateData.phone = phone;
        
        if (updateData.firstName || updateData.lastName) {
          updateData.name = `${updateData.firstName || patient.firstName} ${updateData.lastName || patient.lastName}`;
        }
        
        if (Object.keys(updateData).length > 0) {
          patient = await tx.user.update({
            where: { id: patient.id },
            data: updateData,
          });
        }
      }
      
      // Get dentist
      const dentist = await tx.user.findUnique({ where: { id: dentistId } });
      if (!dentist) {
        throw new Error("Dentist does not exist.");
      }
      
      // Create case - this is the critical part that must be atomic
      const newCase = await tx.case.create({
        data: {
          id: caseId,
          caseNumber: finalCaseNumber,
          patientId: patient.id,
          dentistId: dentist.id,
          patientFirstName: patient.firstName || patientFirstName,
          patientLastName: patient.lastName || patientLastName,
          patientEmail: patient.email,
          patientSex: patient.sex || sex,
          patientDOB: patient.dateOfBirth || dateOfBirth,
          patientPhone: patient.phone || phone || "",
          scanFileUrl,
          upperScanFile,
          lowerScanFile,
          biteScanFile,
          notes: notes || null,
          status: CASE_STATUS.PENDING_REVIEW,
          hiddenByDentist: false,
          archivedByDentist: false,
        },
      });
      
      // Create notification
      await tx.notification.create({
        data: {
          userId: patient.id,
          message: `Dr. ${dentist.name} has submitted a new aligner case for you. Case #${finalCaseNumber}`,
          type: "info"
        }
      });
      
      // Log case creation
      await tx.log.create({
        data: {
          userId: dentist.id,
          action: ACTIVITY_TYPE.CASE_CREATED,
          targetType: TARGET_TYPE.CASE,
          targetId: newCase.id,
          details: JSON.stringify({
            caseNumber: finalCaseNumber,
            patientName: patient.name,
            patientId: patient.id,
            filesUploaded: {
              upper: !!allFiles.upper,
              lower: !!allFiles.lower,
              bite: !!allFiles.bite,
              additional: additionalFiles.length
            }
          }),
        },
      });
      
      // Create case activity
      await tx.caseActivity.create({
        data: {
          caseId: newCase.id,
          userId: dentist.id,
          userName: dentist.name,
          action: ACTIVITY_TYPE.CASE_CREATED,
          details: `Case created for patient ${patient.name}`,
        },
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
      isolationLevel: 'Serializable',
      timeout: 30000,
    });
    
    // Send registration email if new patient (outside transaction)
    if (result.newPatientInvited && result.emailVerificationCode) {
      await sendRegistrationEmail(
        patientEmail, 
        result.emailVerificationCode, 
        `${patientFirstName} ${patientLastName}`,
        result.dentist.name
      );
    }
    
    const response = {
      success: true,
      caseId: result.newCase.id,
      caseNumber: result.finalCaseNumber,
      patientId: result.patient.id,
      patientInvited: result.newPatientInvited,
    };
    
    // Update cache with successful response
    if (requestId) {
      requestCache.set(requestId, {
        timestamp: Date.now(),
        result: response,
        status: 'completed'
      });
    }
    
    // Resolve the lock with the successful response
    if (resolvelock) {
      resolvelock(response);
    }
    
    // Clean up the lock after a short delay
    setTimeout(() => {
      caseLocks.delete(lockKey);
    }, 1000);
    
    return NextResponse.json(response);
    
  } catch (err: any) {
    console.error("API /api/cases POST error:", err);
    
    // Update cache with error status
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
    
    // Handle specific errors
    if (err.message?.includes('already exists')) {
      return NextResponse.json({ 
        error: err.message 
      }, { status: 409 });
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