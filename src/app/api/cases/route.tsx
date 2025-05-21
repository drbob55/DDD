import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET all pending cases for reviewer
export async function GET(req: Request) {
    // Only pending review cases
    const cases = await prisma.case.findMany({
        where: { status: "PENDING_REVIEW" },
        include: {
            patient: true,
            dentist: true,
        },
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ cases });
}
