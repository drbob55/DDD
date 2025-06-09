import { prisma } from "@/lib/prisma";
// /src/app/api/payments/reports/route.tsx

import { NextRequest, NextResponse } from "next/server";
export async function GET(req: NextRequest) {
  // Filter by date, userId, status, etc.
  const { searchParams } = new URL(req.url);
  // ...add filter logic if needed
  const payments = await prisma.payment.findMany({});
  // Add summaries/aggregations as needed
  return NextResponse.json({ payments });
}
