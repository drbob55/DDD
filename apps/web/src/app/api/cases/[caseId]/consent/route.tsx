import { ROLES, CASE_STATUS, PAYMENT_STATUS, SEX_OPTIONS, isValidRole, isValidSex } from '@dental/shared';
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: { caseId: string } }) {
    const { consent } = await req.json(); // { consent: true/false }
    const caseId = params.caseId;
    
    // Update both status and patientConsented fields
    const status = consent ? CASE_STATUS.MANUFACTURING : "REJECTED";
    const patientConsented = consent;
    
    const updatedCase = await prisma.case.update({
        where: { id: caseId },
        data: { 
            status,
            patientConsented 
        },
    });
    
    return NextResponse.json({ success: true, case: updatedCase });
}