// app/api/users/exists/route.ts
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// GET method for DentistDashboard
export async function GET(req: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    console.log("Session in /api/users/exists GET:", session);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get email from query params
    const url = new URL(req.url);
    const email = url.searchParams.get("email");
    console.log("Checking email:", email);

    if (!email) {
      return NextResponse.json({ error: "Email parameter is required" }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        sex: true,
        dateOfBirth: true,
      },
    });
    
    console.log("User found:", user ? "Yes" : "No");

    if (user) {
      return NextResponse.json({
        exists: true,
        ...user,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } else {
      return NextResponse.json({
        exists: false,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  } catch (error) {
    console.error("Error in /api/users/exists GET:", error);
    
    // Return more detailed error in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error instanceof Error ? error.message : 'Unknown error'
      : 'Internal server error';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

// POST method for page.tsx (login/register flow)
export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body = await req.json();
    const { identifier } = body;
    
    console.log("Checking identifier:", identifier);

    if (!identifier) {
      return NextResponse.json({ error: "Identifier is required" }, { status: 400 });
    }

    // Check by email, username, or phone
    let user = null;
    
    // First try email
    if (identifier.includes("@")) {
      user = await prisma.user.findUnique({
        where: { email: identifier.toLowerCase().trim() },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          role: true,
        },
      });
    }
    
    // If not found by email, try username
    if (!user) {
      user = await prisma.user.findUnique({
        where: { username: identifier },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          role: true,
        },
      });
    }
    
    // If not found by username, try phone
    if (!user && /^\+?\d{10,}$/.test(identifier.replace(/\s/g, ""))) {
      user = await prisma.user.findFirst({
        where: { phone: identifier.replace(/\s/g, "") },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          role: true,
        },
      });
    }
    
    console.log("User found:", user ? "Yes" : "No");

    return NextResponse.json({
      exists: !!user,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
  } catch (error) {
    console.error("Error in /api/users/exists POST:", error);
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}