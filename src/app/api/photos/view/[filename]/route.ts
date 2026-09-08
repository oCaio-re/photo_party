import { NextRequest, NextResponse } from "next/server";
import { getStorageProvider } from "@/lib/storage";
import path from "path";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;
    const safeFilename = path.basename(filename);

    const storage = getStorageProvider();
    const stream = await storage.getFileStream(safeFilename);

    let contentType = "image/jpeg";
    if (safeFilename.endsWith(".png")) contentType = "image/png";
    if (safeFilename.endsWith(".webp")) contentType = "image/webp";

    const webStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk) => controller.enqueue(chunk));
        stream.on("end", () => controller.close());
        stream.on("error", (err) => controller.error(err));
      },
    });

    return new Response(webStream, {
      headers: {
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("View photo error:", error);
    return new NextResponse("Foto não encontrada", { status: 404 });
  }
}
