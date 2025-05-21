import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const { name, email, password, role } = await req.json();

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered." }, { status: 400 });
  }

  const hashed = await hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, password: hashed, role },
  });

  return NextResponse.json({ success: true, user: { id: user.id, email: user.email } });
}