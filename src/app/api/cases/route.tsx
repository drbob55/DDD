import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, existsSync, mkdirSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { promisify } from "util";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import bcryptjs from "bcryptjs";
import { ROLES, CASE_STATUS, SEX_OPTIONS, isValidSex } from "@/lib/constants";

// Generate unique 8-digit patient ID (numeric string)
async function generateUniquePatientId() {
  let id: string;
  let exists = true;
  do {
    id = (Math.floor(10000000 + Math.random() * 90000000)).toString();
    exists = !!(await prisma.user.findUnique({ where: { id } }));
  } while (exists);
  return id;
}

// Generate caseId as YYMMDD + 3-digit sequence for the day
async function generateCaseId() {
  const today = new Date();
  const pad = (n: number, len: number = 2) => n.toString().padStart(len, '0');
  const dd = pad(today.getDate());
  const mm = pad(today.getMonth() + 1);
  const yy = today.getFullYear().toString().slice(-2);
  const todayPrefix = `${yy}${mm}${dd}`;
  const todayCases = await prisma.case.findMany({
    where: { id: { startsWith: todayPrefix } },
    select: { id: true }
  });
  const nextNumber = todayCases.length + 1;
  const suffix = nextNumber.toString().padStart(3, '0');
  return `${todayPrefix}${suffix}`;
}

// Generate case number in YYMMDD-XXX format
async function generateCaseNumber() {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${year}${month}${day}-${random}`;
}

// Registration email function
async function sendRegistrationEmail(email: string, token: string, patientName: string, dentistName: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const link = `${baseUrl}/register?token=${token}`;
  
  // TODO: Replace with actual email service (SendGrid, AWS SES, etc.)
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

// GET: Fetch cases based on role
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
    
    let where: any = {};
    
    // Role-based filtering
    if (session.user.role === ROLES.DENTIST) {
      where.dentistId = session.user.id;
      where.hiddenByDentist = false; // Only show non-hidden cases for dentists
    } else if (session.user.role === ROLES.PATIENT) {
      where.patientId = session.user.id;
    } else if (session.user.role === ROLES.REVIEWER) {
      where.reviewerId = session.user.id;
    } else if (session.user.role === ROLES.ADMIN) {
      // Admin can see all, apply filters if provided
      if (dentistId) where.dentistId = dentistId;
      if (patientId) where.patientId = patientId;
      if (reviewerId) where.reviewerId = reviewerId;
      
      // Apply status filter if provided in query params
      const status = url.searchParams.get("status");
      if (status) where.status = status;
    } else {
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
            name: true,
            email: true,
            phone: true,
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
        appointments: {
          orderBy: { date: "asc" },
          take: 1, // Get only the next appointment
        },
      },
      orderBy: { createdAt: "desc" },
    });
    
    console.log(`Found ${cases.length} cases for user ${session.user.id} with role ${session.user.role}`);
    console.log("Where clause:", where);
    
    return NextResponse.json({ cases });
  } catch (err: any) {
    console.error("API /api/cases GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Create new case
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== ROLES.DENTIST) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const dentistId = session.user.id;
    const formData = await req.formData();
    
    // Patient info fields
    const patientFirstName = (formData.get("patientFirstName") as string)?.trim();
    const patientLastName = (formData.get("patientLastName") as string)?.trim();
    const patientEmail = (formData.get("patientEmail") as string)?.toLowerCase();
    const phone = (formData.get("phone") as string)?.trim();
    const notes = (formData.get("notes") as string)?.trim();
    const sex = formData.get("sex") as string;
    const dateOfBirthRaw = formData.get("dateOfBirth") as string;
    const caseNumber = (formData.get("caseNumber") as string)?.trim();
    
    // VALIDATE patient info
    if (
      !patientFirstName ||
      !patientLastName ||
      !patientEmail ||
      !sex ||
      !dateOfBirthRaw
    ) {
      return NextResponse.json({ error: "All patient info is required." }, { status: 400 });
    }
    
    // Validate sex enum
    if (!isValidSex(sex)) {
      return NextResponse.json({ error: "Invalid sex value" }, { status: 400 });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(patientEmail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    
    // Parse date as YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirthRaw)) {
      return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });
    }
    const dateOfBirth = new Date(dateOfBirthRaw);
    
    // Generate case number if not provided
    const finalCaseNumber = caseNumber || await generateCaseNumber();
    
    // --- Create Case ID ---
    const caseId = await generateCaseId();
    
    // ---- FILE UPLOAD SECTION ----
    const fileFields = ["upper", "lower", "bite"];
    const uploadedFiles: Record<string, string | null> = { upper: null, lower: null, bite: null };
    const uploadDir = path.join(process.cwd(), "uploads");
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
    
    // Find or create patient by email
    let patient = await prisma.user.findUnique({ where: { email: patientEmail } });
    let patientId: string;
    let confirmationToken: string | null = null;
    let newPatientInvited = false;
    
    if (!patient) {
      // --- Create patient ---
      patientId = await generateUniquePatientId();
      confirmationToken = uuidv4();
      
      // Generate a temporary password that will be replaced when patient registers
      const tempPassword = uuidv4();
      const hashedTempPassword = await bcryptjs.hash(tempPassword, 12);
      
      patient = await prisma.user.create({
        data: {
          id: patientId,
          name: `${patientFirstName} ${patientLastName}`,
          firstName: patientFirstName,
          lastName: patientLastName,
          email: patientEmail,
          password: hashedTempPassword,
          phone: phone || null,
          role: ROLES.PATIENT,
          sex,
          dateOfBirth,
          confirmed: false,
          confirmationToken,
        },
      });
      newPatientInvited = true;
    } else {
      // --- Patient exists: Use ID, and fill in missing info if blank
      patientId = patient.id;
      const updateData: any = {};
      if (!patient.firstName && patientFirstName) updateData.firstName = patientFirstName;
      if (!patient.lastName && patientLastName) updateData.lastName = patientLastName;
      if (!patient.sex && sex) updateData.sex = sex;
      if (!patient.dateOfBirth && dateOfBirth) updateData.dateOfBirth = dateOfBirth;
      if (!patient.phone && phone) updateData.phone = phone;
      
      // Update name if first/last name changed
      if (updateData.firstName || updateData.lastName) {
        updateData.name = `${updateData.firstName || patient.firstName} ${updateData.lastName || patient.lastName}`;
      }
      
      if (Object.keys(updateData).length > 0) {
        patient = await prisma.user.update({
          where: { id: patient.id },
          data: updateData,
        });
      }
    }
    
    // --- RENAME FILES with case number and scan type ---
    for (const field of fileFields) {
      const file = formData.get(field) as File;
      if (file && file.name) {
        const fileExt = path.extname(file.name).toLowerCase();
        const allowedExtensions = [".stl", ".obj", ".zip", ".ply"];
        if (!allowedExtensions.includes(fileExt)) {
          return NextResponse.json({ error: `File type ${fileExt} not allowed for ${field}` }, { status: 400 });
        }
        
        // Create filename with case number and scan type: CaseNumber_ScanType_UniqueID.ext
        const safeName = `${finalCaseNumber}_${field}_${uuidv4()}${fileExt}`.replace(/\s+/g, "_");
        const filePath = path.join(uploadDir, safeName);
        const arrayBuffer = await file.arrayBuffer();
        await promisify(writeFile)(filePath, Buffer.from(arrayBuffer));
        uploadedFiles[field] = safeName;
      }
    }
    
    if (!uploadedFiles.upper && !uploadedFiles.lower && !uploadedFiles.bite) {
      return NextResponse.json({ error: "At least one scan file is required." }, { status: 400 });
    }
    
    // --- Confirm dentist exists ---
    const dentist = await prisma.user.findUnique({ where: { id: dentistId } });
    if (!dentist) {
      return NextResponse.json({ error: "Dentist does not exist." }, { status: 400 });
    }
    
    // --- Create Case ---
    const newCase = await prisma.case.create({
      data: {
        id: caseId,
        patientId: patient.id,
        dentistId: dentist.id,
        patientFirstName: patient.firstName || patientFirstName,
        patientLastName: patient.lastName || patientLastName,
        patientEmail: patient.email,
        patientSex: patient.sex || sex,
        patientDOB: patient.dateOfBirth || dateOfBirth,
        patientPhone: patient.phone || phone || null,
        upperScanFile: uploadedFiles.upper,
        lowerScanFile: uploadedFiles.lower,
        biteScanFile: uploadedFiles.bite,
        notes: notes || null,
        status: CASE_STATUS.PENDING_REVIEW,
        caseNumber: finalCaseNumber,
        // hiddenByDentist: false, // Comment out until migration is run
      },
    });
    
    // --- Invite patient to register if new ---
    if (newPatientInvited && confirmationToken) {
      await sendRegistrationEmail(
        patientEmail, 
        confirmationToken, 
        `${patientFirstName} ${patientLastName}`,
        dentist.name
      );
    }
    
    // Log case creation
    await prisma.log.create({
      data: {
        userId: dentist.id,
        action: "CASE_CREATED",
        targetType: "CASE",
        targetId: newCase.id,
        details: `Case ${newCase.id} created for patient ${patient.name}`,
      },
    });
    
    return NextResponse.json({
      success: true,
      caseId: newCase.id,
      caseNumber: finalCaseNumber,
      patientId,
      patientInvited: newPatientInvited,
    });
    
  } catch (err: any) {
    console.error("API /api/cases POST error:", err);
    return NextResponse.json({ error: "Internal server error: " + err.message }, { status: 500 });
  }
}