import { prisma } from "@/lib/prisma";
import { ROLES, CASE_STATUS, PAYMENT_STATUS, SEX_OPTIONS } from "@/lib/constants";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== ROLES.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { reviewerId } = await req.json();
    const caseId = params.caseId;
    
    // Allow null to unassign
    if (reviewerId) {
      // Verify reviewer exists and has correct role
      const reviewer = await prisma.user.findUnique({
        where: { id: reviewerId },
      });
      
      if (!reviewer || reviewer.role !== ROLES.REVIEWER) {
        return NextResponse.json({ error: "Invalid reviewer ID" }, { status: 400 });
      }
    }
    
    const updatedCase = await prisma.case.update({
      where: { id: caseId },
      data: { reviewerId: reviewerId || null },
    });
    
    // Create notification for new reviewer
    if (reviewerId) {
      await prisma.notification.create({
        data: {
          userId: reviewerId,
          message: `You have been assigned to review case ${caseId}`,
        },
      });
    }
    
    // Log the action
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: "ADMIN_REASSIGN_REVIEWER",
        targetType: "CASE",
        targetId: caseId,
        details: reviewerId 
          ? `Admin reassigned case to reviewer ${reviewerId}`
          : `Admin unassigned reviewer from case`,
      },
    });
    
    return NextResponse.json({ success: true, case: updatedCase });
  } catch (err: any) {
    console.error("Reassign reviewer error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}