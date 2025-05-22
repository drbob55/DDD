import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { writeFile, existsSync, mkdirSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { promisify } from "util";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route"; // Make sure this path is correct

const prisma = new PrismaClient();

// GET all pending cases for reviewer
export async function GET(req: NextRequest) {
    try {
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

// POST: Create a new case and save scan file
export async function POST(req: NextRequest) {
    try {
        // Get the session (logged-in user)
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

        // Save file to /public/uploads/
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

        // Double-check the dentist exists (should always be true, but for safety)
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
