import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const newPassword = 'password123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update dentist1's password
    const updated = await prisma.user.updateMany({
      where: { 
        OR: [
          { username: 'dentist1' },
          { email: 'dentist1@dental.com' }
        ]
      },
      data: {
        password: hashedPassword,
      },
    });
    
    return NextResponse.json({ 
      message: `Updated ${updated.count} user(s) with password: ${newPassword}` 
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}