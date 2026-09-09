import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, photos, tables } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getStorageProvider } from "@/lib/storage";
import { validateImageBuffer } from "@/lib/file-security";
import crypto from "crypto";

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

    // Check if uploads are closed manually or expired
    if (event.isUploadClosed) {
      return NextResponse.json(
        { error: "O recebimento de fotos deste evento foi encerrado pelo anfitrião." },
        { status: 403 }
      );
    }

    if (event.uploadDeadline && new Date() > event.uploadDeadline) {
      return NextResponse.json(
        { error: "A janela de tempo para envio de fotos expirou." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const tableId = formData.get("tableId") as string | null;
    const guestName = formData.get("guestName") as string | null;
    const message = formData.get("message") as string | null;
    const rawSessionId =
      (formData.get("guestSessionId") as string | null) ||
      request.headers.get("x-guest-session-id") ||
      "";
    const guestSessionId =
      typeof rawSessionId === "string" && rawSessionId.trim()
        ? rawSessionId.trim().slice(0, 100)
        : null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    // Enforce 15MB maximum size limit
    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "O arquivo excede o tamanho máximo de 15MB" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate magic bytes & extension
    const { valid, extension, mime } = validateImageBuffer(buffer);
    if (!valid) {
      return NextResponse.json(
        { error: "Arquivo inválido. Por favor envie uma imagem válida (JPEG, PNG ou WebP)." },
        { status: 400 }
      );
    }

    // Optional table check
    let validTableId: string | null = null;
    if (tableId) {
      const [tableRecord] = await db
        .select()
        .from(tables)
        .where(eq(tables.id, tableId))
        .limit(1);
      if (tableRecord && tableRecord.eventId === event.id) {
        validTableId = tableRecord.id;
      }
    }

    // Safe random filename
    const uniqueFilename = `${crypto.randomUUID()}.${extension}`;

    // Upload using storage provider
    const storage = getStorageProvider();
    const { storagePath, url } = await storage.uploadFile(buffer, uniqueFilename, mime);

    // Initial status according to moderation policy
    const initialStatus = event.moderationPolicy === "approval_required" ? "pending" : "approved";

    const photoId = crypto.randomUUID();
    const now = new Date();

    await db.insert(photos).values({
      id: photoId,
      eventId: event.id,
      tableId: validTableId,
      guestName: guestName ? guestName.trim().slice(0, 100) : null,
      guestSessionId,
      message: message ? message.trim().slice(0, 500) : null,
      storagePath,
      url,
      status: initialStatus,
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      photo: {
        id: photoId,
        url,
        status: initialStatus,
        guestName,
        message,
        canDelete: true,
        createdAt: now,
      },
      message:
        initialStatus === "pending"
          ? "Foto enviada com sucesso! Aguardando aprovação do anfitrião."
          : "Foto publicada com sucesso na Live Gallery!",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Falha ao processar o upload da foto." }, { status: 500 });
  }
}
