import { prisma } from "@/lib/prisma";
import { ROLES, CASE_STATUS, PAYMENT_STATUS, SEX_OPTIONS } from "@/lib/constants";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../apps/web/src/app/api/auth/[...nextauth]/route";

/**
 * GET /api/logs
 * - Admin-only: fetch logs (optional filter by userId, action, targetType)
 * - Supports ?userId=&action=&targetType=
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== ROLES.ADMIN) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const action = url.searchParams.get("action");
    const targetType = url.searchParams.get("targetType");
    
    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = { equals: action, mode: "insensitive" };
    if (targetType) where.targetType = { equals: targetType, mode: "insensitive" };
    
    const logs = await prisma.log.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200, // Limit for performance
    });
    
    // Parse JSON details if stored as stringified JSON
    const parsedLogs = logs.map(l => ({
      ...l,
      details: typeof l.details === "string"
        ? (() => { try { return JSON.parse(l.details); } catch { return l.details; } })()
        : l.details
    }));
    
    return NextResponse.json({ logs: parsedLogs });
  } catch (error: any) {
    console.error("GET /api/logs error:", error);
    return NextResponse.json({ error: "Server error: " + error.message }, { status: 500 });
  }
}

/**
 * POST /api/logs
 * - For logging events (system or API actions)
 * - Required: action, targetType
 * - Optional: userId, targetId, details (object or string)
 */
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { userId, action, targetType, targetId, details } = data;
    
    if (!action || !targetType) {
      return NextResponse.json({ error: "Missing required fields: action, targetType" }, { status: 400 });
    }
    
    // Always store details as JSON (parse if string)
    let detailsValue: any = null;
    if (details !== undefined && details !== null) {
      if (typeof details === "object") {
        detailsValue = details;
      } else if (typeof details === "string") {
        try {
          detailsValue = JSON.parse(details);
        } catch {
          detailsValue = { raw: details };
        }
      } else {
        detailsValue = { raw: String(details) };
      }
    }
    
    const log = await prisma.log.create({
      data: {
        userId: userId || null,
        action,
        targetType,
        targetId: targetId || null,
        details: detailsValue ? JSON.stringify(detailsValue) : null,
      },
    });
    
    return NextResponse.json({ log });
  } catch (error: any) {
    console.error("POST /api/logs error:", error);
    return NextResponse.json({ error: "Server error: " + error.message }, { status: 500 });
  }
}