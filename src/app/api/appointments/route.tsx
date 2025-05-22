import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// GET /api/appointments?caseId=...
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const caseId = searchParams.get("caseId");
    if (!caseId) {
        return NextResponse.json({ error: "Missing caseId" }, { status: 400 });
    }
    const appts = await prisma.appointment.findMany({
        where: { caseId },
        orderBy: { date: "asc" },
    });
    return NextResponse.json({ appointments: appts });
}

// POST (schedule appointment)
export async function POST(req: NextRequest) {
    const { caseId, userId, date, notes } = await req.json();
    if (!caseId || !userId || !date) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const appt = await prisma.appointment.create({
        data: { caseId, userId, date: new Date(date), notes },
    });
    return NextResponse.json({ appointment: appt });
}
