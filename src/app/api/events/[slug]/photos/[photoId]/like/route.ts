import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, photos, photoLikes } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";

export async function POST(
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

    const body = await request.json().catch(() => ({}));
    const guestSessionId = (
      body.guestSessionId ||
      request.headers.get("x-guest-session-id") ||
      ""
    ).trim();

    if (!guestSessionId || typeof guestSessionId !== "string" || guestSessionId.length > 100) {
      return NextResponse.json(
        { error: "Sessão de convidado inválida" },
        { status: 400 }
      );
    }

    // Check if like exists
    const [existingLike] = await db
      .select()
      .from(photoLikes)
      .where(
        and(
          eq(photoLikes.photoId, photoId),
          eq(photoLikes.guestSessionId, guestSessionId)
        )
      )
      .limit(1);

    let liked = false;
    if (existingLike) {
      // Toggle off (unlike)
      await db.delete(photoLikes).where(eq(photoLikes.id, existingLike.id));
      liked = false;
    } else {
      // Toggle on (like)
      await db.insert(photoLikes).values({
        id: crypto.randomUUID(),
        photoId,
        guestSessionId,
        createdAt: new Date(),
      });
      liked = true;
    }

    const [countRes] = await db
      .select({
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(photoLikes)
      .where(eq(photoLikes.photoId, photoId))
      .limit(1);

    return NextResponse.json({
      liked,
      likeCount: countRes?.count || 0,
    });
  } catch (error) {
    console.error("Error toggling like:", error);
    return NextResponse.json(
      { error: "Erro ao registrar curtida" },
      { status: 500 }
    );
  }
}
