import { NextRequest, NextResponse } from "next/server";
import { getStorageProvider } from "@/lib/storage";
import { mimeForFilename } from "@/lib/file-security";
import { Readable } from "stream";
import path from "path";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;
    const safeFilename = path.basename(filename);

    // iOS Safari only plays <video> when the server honours byte ranges (206)
    const range = request.headers.get("range");
    const storage = getStorageProvider();
    const file = await storage.getFile(safeFilename, range);

    const headers: Record<string, string> = {
      "Content-Type": mimeForFilename(safeFilename),
      "Accept-Ranges": "bytes",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
    };
    if (file.contentLength !== undefined) {
      headers["Content-Length"] = String(file.contentLength);
    }
    if (file.contentRange) {
      headers["Content-Range"] = file.contentRange;
    }

    return new Response(Readable.toWeb(file.body) as ReadableStream, {
      status: file.contentRange ? 206 : 200,
      headers,
    });
  } catch (error) {
    if ((error as { name?: string })?.name === "InvalidRange") {
      return new NextResponse(null, { status: 416 });
    }
    console.error("View photo error:", error);
    return new NextResponse("Foto não encontrada", { status: 404 });
  }
}
