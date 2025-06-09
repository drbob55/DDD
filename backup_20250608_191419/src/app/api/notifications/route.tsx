import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { ROLES } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== ROLES.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { userIds, message } = await req.json();
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "User IDs are required" }, { status: 400 });
    }
    
    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }
    
    // Create notifications for all users
    const notifications = await prisma.notification.createMany({
      data: userIds.map(userId => ({
        userId,
        message: message.trim(),
      })),
    });
    
    // Log the action
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: "BULK_NOTIFICATION_SENT",
        targetType: "NOTIFICATION",
        details: `Sent notification to ${userIds.length} users: "${message.substring(0, 50)}..."`,
      },
    });
    
    return NextResponse.json({ 
      success: true, 
      count: notifications.count,
      message: `Notifications sent to ${notifications.count} users` 
    });
  } catch (err: any) {
    console.error("Bulk notification error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}