// app/api/test/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'API routes are working!',
    timestamp: new Date().toISOString()
  });
}

export async function POST() {
  return NextResponse.json({ 
    message: 'POST endpoint working!',
    timestamp: new Date().toISOString()
  });
}