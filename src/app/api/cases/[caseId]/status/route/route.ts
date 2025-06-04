import { prisma } from "@/lib/prisma";
import { ROLES, CASE_STATUS, PAYMENT_STATUS, SEX_OPTIONS } from "@/lib/constants";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== ROLES.ADMIN) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    
    const { status } = await req.json();
    if (!status) {
      return NextResponse.json({ error: "Missing status" }, { status: 400 });
    }
    
    const updated = await prisma.case.update({
      where: { id: params.caseId },
      data: { status },
    });
    
    return NextResponse.json({ case: updated });
  } catch (err: any) {
    console.error("Case status update error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}