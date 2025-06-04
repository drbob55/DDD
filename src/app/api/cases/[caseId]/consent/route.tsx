import { ROLES, CASE_STATUS, PAYMENT_STATUS, SEX_OPTIONS, isValidRole, isValidSex } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: { caseId: string } }) {
    const { consent } = await req.json(); // { consent: true/false }
    const caseId = params.caseId;
    const status = consent ? CASE_STATUS.IN_TREATMENT : "REJECTED";
    const updatedCase = await prisma.case.update({
        where: { id: caseId },
        data: { status },
    });
    return NextResponse.json({ success: true, case: updatedCase });
}
