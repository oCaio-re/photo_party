import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, photos } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getStorageProvider } from "@/lib/storage";

function verifyHostKey(request: NextRequest, hostKey: string): boolean {
  const authHeader = request.headers.get("authorization");
  const url = new URL(request.url);
  const keyParam = url.searchParams.get("key");
  const providedKey = authHeader?.replace(/^Bearer\s+/i, "") || keyParam;
  return Boolean(providedKey && providedKey === hostKey);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ slug: string; photoId: string }> }
) {
  try {
    const { slug, photoId } = await context.params;

    const event = db.select().from(events).where(eq(events.slug, slug)).get();
    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    }

    if (!verifyHostKey(request, event.hostKey)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    if (!["approved", "hidden", "pending"].includes(status)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    db.update(photos)
      .set({ status })
      .where(and(eq(photos.id, photoId), eq(photos.eventId, event.id)))
      .run();

    return NextResponse.json({ success: true, photoId, status });
  } catch (error) {
    console.error("Error updating photo status:", error);
    return NextResponse.json({ error: "Erro ao atualizar estado da foto" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ slug: string; photoId: string }> }
) {
  try {
    const { slug, photoId } = await context.params;

    const event = db.select().from(events).where(eq(events.slug, slug)).get();
    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    }

    if (!verifyHostKey(request, event.hostKey)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const photo = db
      .select()
      .from(photos)
      .where(and(eq(photos.id, photoId), eq(photos.eventId, event.id)))
      .get();

    if (!photo) {
      return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 });
    }

    // Delete from storage
    try {
      const storage = getStorageProvider();
      await storage.deleteFile(photo.storagePath);
    } catch (e) {
      console.warn("Storage deletion warning:", e);
    }

    // Delete from database
    db.delete(photos).where(eq(photos.id, photoId)).run();

    return NextResponse.json({ success: true, photoId });
  } catch (error) {
    console.error("Error deleting photo:", error);
    return NextResponse.json({ error: "Erro ao excluir foto" }, { status: 500 });
  }
}
