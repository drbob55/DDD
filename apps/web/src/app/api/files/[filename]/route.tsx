import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { createReadStream, existsSync } from "fs";
import { stat } from "fs/promises";

export async function GET(
    req: NextRequest,
    { params }: { params: { filename: string } }
) {
    const { filename } = params;
    const filePath = path.join(process.cwd(), "uploads", filename);
    if (!existsSync(filePath)) {
        return new NextResponse("File not found", { status: 404 });
    }
    const fileStat = await stat(filePath);
    const stream = createReadStream(filePath);
    return new NextResponse(stream as any, {
        headers: {
            "Content-Type": "application/octet-stream",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Content-Length": fileStat.size.toString(),
        },
    });
}
