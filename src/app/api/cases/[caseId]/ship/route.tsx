import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function POST(req: NextRequest, { params }: { params: { caseId: string } }) {
    // Mark case as shipped
    const updatedCase = await prisma.case.update({
        where: { id: params.caseId },
        data: { status: "SHIPPED" },
    });

    // Fetch patientId for this case
    const theCase = await prisma.case.findUnique({ where: { id: params.caseId } });

    if (theCase?.patientId) {
        await prisma.notification.create({
            data: {
                userId: theCase.patientId,
                message: "Your aligners are ready for pickup!",
            },
        });
    }

    return NextResponse.json({ success: true, case: updatedCase });
}
