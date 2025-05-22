import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function POST(req: NextRequest, { params }: { params: { caseId: string } }) {
    // Mark case as shipped
    const updatedCase = await prisma.case.update({
        where: { id: params.caseId },
        data: { status: "SHIPPED" },
    });
    return NextResponse.json({ success: true, case: updatedCase });
}
