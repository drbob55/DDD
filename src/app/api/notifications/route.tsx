import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// GET /api/notifications?userId=...
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");
        if (!userId) {
            // Always return a valid array!
            return NextResponse.json({ notifications: [] }, { status: 200 });
        }
        const notes = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json({ notifications: notes }, { status: 200 });
    } catch (err: any) {
        // On any error, return an empty array to prevent frontend crash
        console.error("API /api/notifications error:", err);
        return NextResponse.json({ notifications: [] }, { status: 200 });
    }
}

// POST /api/notifications  (Mark all as read)
export async function POST(req: NextRequest) {
    try {
        const { userId } = await req.json();
        if (!userId) {
            // Always respond with valid JSON for frontend
            return NextResponse.json({ success: false, message: "Missing userId" }, { status: 400 });
        }
        await prisma.notification.updateMany({
            where: { userId },
            data: { read: true },
        });
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("API /api/notifications POST error:", err);
        return NextResponse.json({ success: false, message: err.message || "Internal server error" }, { status: 500 });
    }
}
