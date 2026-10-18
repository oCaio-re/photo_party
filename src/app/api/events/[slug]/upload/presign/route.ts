import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, pendingUploads } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { getStorageProvider } from "@/lib/storage";
import { MAX_UPLOAD_BYTES, extensionForMime } from "@/lib/file-security";
import { getUploadBlockReason } from "@/lib/uploads";

/**
 * Step 1 of the direct upload flow: hands the browser a short-lived presigned PUT URL
 * so the media goes straight to object storage instead of through the serverless
 * function (whose request body is capped at ~4.5MB on Vercel).
 *
 * Responds with `{ mode: "server" }` when the storage provider has no presign support
 * (local development), telling the client to fall back to multipart POST /upload.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    const [event] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    }

    const blockReason = getUploadBlockReason(event);
    if (blockReason) {
      return NextResponse.json({ error: blockReason }, { status: 403 });
    }

    const storage = getStorageProvider();
    if (!storage.createUploadUrl) {
      return NextResponse.json({ mode: "server" });
    }

    const body = await request.json().catch(() => ({}));
    const contentType = typeof body.contentType === "string" ? body.contentType : "";
    const size = Number(body.size);

    const extension = extensionForMime(contentType);
    if (!extension) {
      return NextResponse.json(
        { error: "Arquivo inválido. Por favor envie uma foto (JPEG, PNG, WebP) ou clipe de vídeo (MP4, WebM, MOV)." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(size) || size <= 0 || size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "O arquivo excede o tamanho máximo de 15MB" }, { status: 400 });
    }

    const key = `${crypto.randomUUID()}.${extension}`;
    const uploadUrl = await storage.createUploadUrl(key, contentType);
    await db.insert(pendingUploads).values({ key, eventId: event.id, createdAt: new Date() });

    return NextResponse.json({ mode: "direct", uploadUrl, key, contentType });
  } catch (error) {
    console.error("Presign error:", error);
    return NextResponse.json({ error: "Falha ao preparar o envio da mídia." }, { status: 500 });
  }
}
