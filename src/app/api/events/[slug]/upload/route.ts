import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, pendingUploads } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getStorageProvider } from "@/lib/storage";
import { MAX_UPLOAD_BYTES, validateMediaBuffer } from "@/lib/file-security";
import { createPhotoRecord, getUploadBlockReason } from "@/lib/uploads";
import crypto from "crypto";

const INVALID_MEDIA_ERROR =
  "Arquivo inválido. Por favor envie uma foto (JPEG, PNG, WebP) ou clipe de vídeo (MP4, WebM, MOV).";

// Keys are issued by /upload/presign as `<uuid>.<ext>`
const DIRECT_UPLOAD_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|heic|mp4|webm|mov)$/;

/**
 * Publishes a Photo or Video Clip. Two modes:
 * - JSON `{ key, ...metadata }`: step 2 of the direct upload flow. The browser already
 *   PUT the file to object storage using a presigned URL; here we verify it and record it.
 * - multipart/form-data with `file`: server-side upload (local development fallback).
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

    const headerSessionId = request.headers.get("x-guest-session-id");
    const storage = getStorageProvider();

    if (request.headers.get("content-type")?.includes("application/json")) {
      const body = await request.json().catch(() => ({}));
      const key = typeof body.key === "string" ? body.key : "";
      if (!DIRECT_UPLOAD_KEY.test(key)) {
        return NextResponse.json({ error: "Envio inválido." }, { status: 400 });
      }

      // Claim the key atomically: only keys issued for this Event, and only once
      const [claimed] = await db
        .delete(pendingUploads)
        .where(and(eq(pendingUploads.key, key), eq(pendingUploads.eventId, event.id)))
        .returning();
      if (!claimed) {
        return NextResponse.json({ error: "Envio expirado ou já publicado. Tente novamente." }, { status: 409 });
      }

      try {
        const size = await storage.getFileSize(key);
        if (size === null) {
          // Nothing was uploaded; put the claim back so the Guest can retry the PUT
          await db.insert(pendingUploads).values(claimed).onConflictDoNothing();
          return NextResponse.json({ error: "Arquivo não encontrado. Tente enviar novamente." }, { status: 400 });
        }

        const head = await storage.readFileHead(key, 32);
        const { valid, mediaType } = validateMediaBuffer(head);
        if (size > MAX_UPLOAD_BYTES || !valid) {
          await storage.deleteFile(key);
          return NextResponse.json(
            { error: size > MAX_UPLOAD_BYTES ? "O arquivo excede o tamanho máximo de 15MB" : INVALID_MEDIA_ERROR },
            { status: 400 }
          );
        }

        const result = await createPhotoRecord({
          event,
          storagePath: key,
          url: storage.getPublicUrl(key),
          mediaType,
          metadata: { ...body, guestSessionId: body.guestSessionId || headerSessionId },
        });
        return NextResponse.json(result);
      } catch (error) {
        // Restore the claim so the cleanup cron still owns the file if nothing was published
        await db.insert(pendingUploads).values(claimed).onConflictDoNothing().catch(() => {});
        throw error;
      }
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "O arquivo excede o tamanho máximo de 15MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate magic bytes & extension (image or video clip)
    const { valid, mediaType, extension, mime } = validateMediaBuffer(buffer);
    if (!valid) {
      return NextResponse.json({ error: INVALID_MEDIA_ERROR }, { status: 400 });
    }

    const uniqueFilename = `${crypto.randomUUID()}.${extension}`;
    const { storagePath, url } = await storage.uploadFile(buffer, uniqueFilename, mime);

    const field = (name: string) => formData.get(name) as string | null;
    const result = await createPhotoRecord({
      event,
      storagePath,
      url,
      mediaType,
      metadata: {
        tableId: field("tableId"),
        questId: field("questId"),
        guestName: field("guestName"),
        message: field("message"),
        moment: field("moment"),
        guestSessionId: field("guestSessionId") || headerSessionId,
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Falha ao processar o upload da foto." }, { status: 500 });
  }
}
