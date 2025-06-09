import { prisma } from "@/lib/prisma";
import { ROLES, CASE_STATUS, PAYMENT_STATUS, SEX_OPTIONS } from "@/lib/constants";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    
    if (!token) {
      return NextResponse.json({ valid: false, error: "Token is required" }, { status: 400 });
    }
    
    // Find user with this confirmation token
    const user = await prisma.user.findFirst({
      where: {
        confirmationToken: token,
        confirmed: false,
        role: ROLES.PATIENT,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        name: true,
      },
    });
    
    if (!user) {
      return NextResponse.json({ valid: false, error: "Invalid or expired token" }, { status: 404 });
    }
    
    return NextResponse.json({
      valid: true,
      user,
    });
    
  } catch (err: any) {
    console.error("Token verification error:", err);
    return NextResponse.json({ valid: false, error: "Server error" }, { status: 500 });
  }
}