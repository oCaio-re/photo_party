import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, photos, photoComments } from "@/db/schema";
import { eq, and, asc, sql } from "drizzle-orm";
import crypto from "crypto";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string; photoId: string }> }
) {
  try {
    const { slug, photoId } = await context.params;
    const { searchParams } = new URL(request.url);

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

    const guestSessionId = (
      request.headers.get("x-guest-session-id") ||
      searchParams.get("guestSessionId") ||
      ""
    ).trim();

    const authHeader = request.headers.get("authorization");
    const keyParam = searchParams.get("key");
    const providedKey = authHeader?.replace(/^Bearer\s+/i, "") || keyParam;
    const isHost = Boolean(providedKey && providedKey === event.hostKey);

    const comments = await db
      .select({
        id: photoComments.id,
        photoId: photoComments.photoId,
        guestName: photoComments.guestName,
        content: photoComments.content,
        createdAt: photoComments.createdAt,
        guestSessionId: photoComments.guestSessionId,
      })
      .from(photoComments)
      .where(eq(photoComments.photoId, photoId))
      .orderBy(asc(photoComments.createdAt));

    const formatted = comments.map((c) => ({
      id: c.id,
      photoId: c.photoId,
      guestName: c.guestName,
      content: c.content,
      createdAt: c.createdAt,
      canDelete: isHost || (Boolean(guestSessionId) && c.guestSessionId === guestSessionId),
    }));

    return NextResponse.json({
      comments: formatted,
      count: formatted.length,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Erro ao carregar comentários" },
      { status: 500 }
    );
  }
}

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

    const guestName = (body.guestName || "").trim();
    if (!guestName || typeof guestName !== "string" || guestName.length > 60) {
      return NextResponse.json(
        { error: "Nome de convidado obrigatório (máximo 60 caracteres)" },
        { status: 400 }
      );
    }

    const content = (body.content || "").trim();
    if (!content || typeof content !== "string" || content.length > 500) {
      return NextResponse.json(
        { error: "Comentário não pode ser vazio ou ter mais de 500 caracteres" },
        { status: 400 }
      );
    }

    const commentId = crypto.randomUUID();
    const now = new Date();

    await db.insert(photoComments).values({
      id: commentId,
      photoId,
      guestSessionId,
      guestName,
      content,
      createdAt: now,
    });

    const [countRes] = await db
      .select({
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(photoComments)
      .where(eq(photoComments.photoId, photoId))
      .limit(1);

    return NextResponse.json(
      {
        comment: {
          id: commentId,
          photoId,
          guestName,
          content,
          createdAt: now,
          canDelete: true,
        },
        commentCount: countRes?.count || 1,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Erro ao publicar comentário" },
      { status: 500 }
    );
  }
}
