// app/api/users/exists/route.ts
import { repositoryFactory, NotFoundError } from "@dental/database";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

    // Get user repository
    const userRepo = repositoryFactory.createUserRepository();

    try {
      // Check if user exists with PATIENT role (for case creation)
      const user = await userRepo.findByEmail(email.toLowerCase().trim());
      
      if (user && user.role === 'PATIENT') {
        console.log("User found:", "Yes");
        return NextResponse.json({
          exists: true,
          id: user.id,
          userId: user.userId,
          email: user.email,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          phone: user.phone,
          sex: user.sex,
          dateOfBirth: user.dateOfBirth,
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } else {
        console.log("User found:", "No");
        return NextResponse.json({
          exists: false,
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        return NextResponse.json({
          exists: false,
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
      throw error;
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

    // Get user repository
    const userRepo = repositoryFactory.createUserRepository();
    let user = null;
    
    try {
      // First try email
      if (identifier.includes("@")) {
        user = await userRepo.findByEmail(identifier.toLowerCase().trim());
      }
      
      // If not found by email, try username
      if (!user) {
        user = await userRepo.findByUsername(identifier);
      }
      
      // If not found by username, try phone
      if (!user && /^\+?\d{10,}$/.test(identifier.replace(/\s/g, ""))) {
        user = await userRepo.findByPhone(identifier.replace(/\s/g, ""));
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        // User not found is expected, continue
        user = null;
      } else {
        throw error;
      }
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