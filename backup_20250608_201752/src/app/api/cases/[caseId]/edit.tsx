import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }) {
    const { firstName, lastName, email, phone, status } = await req.json();
    // Update user and case
    await prisma.user.update({
        where: { id: params.caseId },
        data: { firstName, lastName, email, phone }
    });
    await prisma.case.update({
        data: { status }
    return NextResponse.json({ success: true });
}
