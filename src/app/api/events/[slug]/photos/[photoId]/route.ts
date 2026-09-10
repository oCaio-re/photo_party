import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, photos, photoLikes, photoComments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getStorageProvider } from "@/lib/storage";

import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

function verifyHostKey(request: NextRequest, hostKey: string): boolean {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (token && verifySessionToken(token)) return true;

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

    const [event] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
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

    await db
      .update(photos)
      .set({ status })
      .where(and(eq(photos.id, photoId), eq(photos.eventId, event.id)));

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

    const [event] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    }

    const [photo] = await db
      .select()
      .from(photos)
      .where(and(eq(photos.id, photoId), eq(photos.eventId, event.id)))
      .limit(1);

    if (!photo) {
      return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 });
    }

    const isHost = verifyHostKey(request, event.hostKey);
    const url = new URL(request.url);
    const guestSessionId = (
      request.headers.get("x-guest-session-id") ||
      url.searchParams.get("guestSessionId") ||
      ""
    ).trim();

    const isAuthor = Boolean(
      guestSessionId &&
      photo.guestSessionId &&
      photo.guestSessionId === guestSessionId
    );

    if (!isHost && !isAuthor) {
      return NextResponse.json(
        { error: "Você só tem permissão para apagar fotos enviadas por você." },
        { status: 403 }
      );
    }

    // Delete from storage
    try {
      const storage = getStorageProvider();
      await storage.deleteFile(photo.storagePath);
    } catch (e) {
      console.warn("Storage deletion warning:", e);
    }

    // Cleanly delete photo interactions and the photo record
    await db.delete(photoLikes).where(eq(photoLikes.photoId, photoId));
    await db.delete(photoComments).where(eq(photoComments.photoId, photoId));
    await db.delete(photos).where(eq(photos.id, photoId));

    return NextResponse.json({ success: true, photoId });
  } catch (error) {
    console.error("Error deleting photo:", error);
    return NextResponse.json({ error: "Erro ao excluir foto" }, { status: 500 });
  }
}
