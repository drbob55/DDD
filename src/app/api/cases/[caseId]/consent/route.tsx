import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function POST(req: NextRequest, { params }: { params: { caseId: string } }) {
    const { consent } = await req.json(); // { consent: true/false }
    const caseId = params.caseId;

    const status = consent ? "IN_TREATMENT" : "REJECTED";

    const updatedCase = await prisma.case.update({
        where: { id: caseId },
        data: { status },
    });

    return NextResponse.json({ success: true, case: updatedCase });
}
