import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }) {
  const caseId = params.id;
  const { dentistId, reviewerId } = await req.json();
  const data: any = {};
  if (dentistId) data.dentistId = dentistId;
  if (reviewerId) data.reviewerId = reviewerId;
  if (!dentistId && !reviewerId) {
    return NextResponse.json({ error: "No assignment provided." }, { status: 400 });
  }
  const updated = await prisma.case.update({
    where: { id: caseId },
    data,
  });
  return NextResponse.json({ success: true, updated });
}
