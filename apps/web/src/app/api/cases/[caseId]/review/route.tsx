import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest, { params }: { params: { caseId: string } }) {
    try {
        const formData = await req.formData();
        const status = formData.get("status") as string; // APPROVED or REJECTED
        const reviewerId = formData.get("reviewerId") as string;
        let treatmentPlanUrl = null;
        
        if (!["APPROVED", "REJECTED"].includes(status)) {
            return NextResponse.json({ error: "Invalid status." }, { status: 400 });
        }
        
        // Save uploaded file if approved
        if (status === "APPROVED") {
            const planFile = formData.get("treatmentPlan") as File;
            if (!planFile || !planFile.name) {
                return NextResponse.json({ error: "Treatment plan file required." }, { status: 400 });
            }
            
            const allowedTypes = [
                "application/octet-stream",
                "application/zip",
                "application/x-stl",
                "model/stl",
                "application/vnd.ms-pki.stl",
                "application/x-tgif",
                "model/obj"
            ];
            const maxSize = 25 * 1024 * 1024; // 25MB
            
            if (!allowedTypes.includes(planFile.type)) {
                return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
            }
            
            if (planFile.size > maxSize) {
                return NextResponse.json({ error: "File too large" }, { status: 400 });
            }
            
            const uploadDir = path.join(process.cwd(), "uploads");
            const fileExt = path.extname(planFile.name);
            const fileName = `${uuidv4()}${fileExt}`;
            const filePath = path.join(uploadDir, fileName);
            
            const arrayBuffer = await planFile.arrayBuffer();
            await writeFile(filePath, Buffer.from(arrayBuffer));
            treatmentPlanUrl = `/uploads/${fileName}`;
        }
        
        // Update case
        const updatedCase = await prisma.case.update({
            where: { id: params.caseId },
            data: {
                reviewerId,
                status: status === "APPROVED" ? "AWAITING_CONSENT" : "REJECTED",
                treatmentPlanUrl: treatmentPlanUrl || undefined,
            },
        });
        
        return NextResponse.json({ success: true, case: updatedCase });
    } catch (err: any) {
        console.error("Reviewer API error:", err);
        return NextResponse.json({ error: "Server error. Please try again later." }, { status: 500 });
    }
}