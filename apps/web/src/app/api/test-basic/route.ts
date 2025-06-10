// app/api/test-basic/route.ts
export async function GET() {
  return Response.json({ message: "API is working!", timestamp: new Date().toISOString() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return Response.json({ 
      message: "POST received", 
      received: body,
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
}