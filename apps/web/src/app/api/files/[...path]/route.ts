// src/app/api/files/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import path from "path";
import { createReadStream, existsSync } from "fs";
import { stat } from "fs/promises";
import { Readable } from 'stream';

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Reconstruct the file path
    const filePath = params.path.join('/');
    
    // Security: Ensure the path doesn't contain directory traversal attempts
    if (filePath.includes('..') || filePath.includes('~')) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    // Construct the full file path
    const fullPath = path.join(process.cwd(), 'public', 'uploads', filePath);
    
    // Check if file exists
    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Get file stats
    const fileStat = await stat(fullPath);
    
    // Create read stream
    const stream = createReadStream(fullPath);
    
    // Convert Node.js stream to Web stream
    const webStream = Readable.toWeb(stream as any);

    // Determine content type based on file extension
    const ext = path.extname(fullPath).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.stl':
        contentType = 'application/sla';
        break;
      case '.obj':
        contentType = 'text/plain';
        break;
      case '.zip':
        contentType = 'application/zip';
        break;
      case '.ply':
        contentType = 'application/ply';
        break;
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
    }

    // Get filename for download
    const filename = path.basename(fullPath);

    // Return the file
    return new NextResponse(webStream as any, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileStat.size.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    );
  }
}