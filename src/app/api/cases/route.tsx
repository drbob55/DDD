import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { writeFile, existsSync, mkdirSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { promisify } from "util";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route"; // Adjust path as needed

const prisma = new PrismaClient();

// GET: /api/cases?status=IN_TREATMENT or /api/cases?userId=... or default to PENDING_REVIEW
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");
        const status = searchParams.get("status");

        // Priority 1: filter by status if provided
        if (status) {
            const cases = await prisma.case.findMany({
                where: { status },
                include: {
                    patient: true,
                    dentist: true,
                },
                orderBy: { createdAt: "desc" },
            });
            return NextResponse.json({ cases });
        }

        // Priority 2: filter by patient userId
        if (userId) {
            const cases = await prisma.case.findMany({
                where: { patientId: userId },
                include: {
                    dentist: true,
                    reviewer: true,
                },
                orderBy: { createdAt: "desc" },
            });
            return NextResponse.json({ cases });
        }

        // Priority 3: fallback - all cases pending review (reviewer dashboard)
        const cases = await prisma.case.findMany({
            where: { status: "PENDING_REVIEW" },
            include: {
                patient: true,
                dentist: true,
            },
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json({ cases });
    } catch (err: any) {
        console.error("API /api/cases GET error:", err);
        return NextResponse.json({ error: "Internal server error: " + err.message }, { status: 500 });
    }
}

// POST: Create a new case and save scan file (Dentist only)
export async function POST(req: NextRequest) {
    try {
        // Authenticate dentist
        const session = await getServerSession(authOptions);

        if (!session?.user || session.user.role !== "DENTIST") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const dentistId = session.user.id;

        const formData = await req.formData();
        const patientName = formData.get("patientName") as string;
        const patientEmail = formData.get("patientEmail") as string;
        const notes = formData.get("notes") as string;
        const file = formData.get("scanFile") as File;

        if (!file || !file.name) {
            return NextResponse.json({ error: "No scan file uploaded." }, { status: 400 });
        }

        // Ensure uploads directory exists
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true });
        }
        const fileExt = path.extname(file.name);
        const fileName = `${uuidv4()}${fileExt}`;
        const filePath = path.join(uploadDir, fileName);

        const arrayBuffer = await file.arrayBuffer();
        await promisify(writeFile)(filePath, Buffer.from(arrayBuffer));

        // Create patient user if not exists
        let patient = await prisma.user.findUnique({ where: { email: patientEmail } });
        if (!patient) {
            patient = await prisma.user.create({
                data: {
                    name: patientName,
                    email: patientEmail,
                    password: "",
                    role: "PATIENT",
                },
            });
        }

        // Double-check the dentist exists
        const dentist = await prisma.user.findUnique({ where: { id: dentistId } });
        if (!dentist) {
            return NextResponse.json({ error: "Dentist does not exist." }, { status: 400 });
        }

        // Create new case
        const newCase = await prisma.case.create({
            data: {
                patientId: patient.id,
                dentistId: dentist.id,
                scanFileUrl: `/uploads/${fileName}`,
                notes,
                status: "PENDING_REVIEW",
            },
        });

        return NextResponse.json({ success: true, caseId: newCase.id });
    } catch (err: any) {
        console.error("API /api/cases POST error:", err);
        return NextResponse.json({ error: "Internal server error: " + err.message }, { status: 500 });
    }
}
