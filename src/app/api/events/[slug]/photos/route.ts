import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, photos, tables, photoComments } from "@/db/schema";
import { eq, and, gt, desc, sql, inArray } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const { searchParams } = new URL(request.url);

    const [event] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    }

    // Check host key
    const authHeader = request.headers.get("authorization");
    const keyParam = searchParams.get("key");
    const providedKey = authHeader?.replace(/^Bearer\s+/i, "") || keyParam;
    const isHost = providedKey === event.hostKey;

    const guestSessionId =
      request.headers.get("x-guest-session-id") ||
      searchParams.get("guestSessionId") ||
      "";

    const requestedStatus = searchParams.get("status"); // 'approved' | 'pending' | 'hidden' | 'all'
    const sinceParam = searchParams.get("since");
    const sinceDate = sinceParam ? new Date(Number(sinceParam)) : null;

    // Base query
    const conditions = [eq(photos.eventId, event.id)];

    if (sinceDate && !isNaN(sinceDate.getTime())) {
      conditions.push(gt(photos.createdAt, sinceDate));
    }

    if (isHost && requestedStatus) {
      if (requestedStatus !== "all") {
        conditions.push(eq(photos.status, requestedStatus as "approved" | "pending" | "hidden"));
      }
    } else {
      // Guests only see approved photos
      conditions.push(eq(photos.status, "approved"));
    }

    const results = await db
      .select({
        id: photos.id,
        url: photos.url,
        guestName: photos.guestName,
        message: photos.message,
        status: photos.status,
        createdAt: photos.createdAt,
        tableId: photos.tableId,
        tableIdentifier: tables.identifier,
        likeCount: sql<number>`(SELECT COUNT(*) FROM photo_likes WHERE photo_likes.photo_id = ${photos.id})`.mapWith(Number),
        commentCount: sql<number>`(SELECT COUNT(*) FROM photo_comments WHERE photo_comments.photo_id = ${photos.id})`.mapWith(Number),
        hasLiked: guestSessionId
          ? sql<boolean>`EXISTS(SELECT 1 FROM photo_likes WHERE photo_likes.photo_id = ${photos.id} AND photo_likes.guest_session_id = ${guestSessionId})`.mapWith(Boolean)
          : sql<boolean>`false`.mapWith(Boolean),
      })
      .from(photos)
      .leftJoin(tables, eq(photos.tableId, tables.id))
      .where(and(...conditions))
      .orderBy(desc(photos.createdAt));

    const photoIds = results.map((p) => p.id);
    const commentsByPhoto = new Map<
      string,
      Array<{ id: string; guestName: string; content: string; createdAt: Date }>
    >();

    if (photoIds.length > 0) {
      const allRecentComments = await db
        .select({
          id: photoComments.id,
          photoId: photoComments.photoId,
          guestName: photoComments.guestName,
          content: photoComments.content,
          createdAt: photoComments.createdAt,
        })
        .from(photoComments)
        .where(inArray(photoComments.photoId, photoIds))
        .orderBy(desc(photoComments.createdAt));

      for (const c of allRecentComments) {
        const list = commentsByPhoto.get(c.photoId) || [];
        if (list.length < 4) {
          list.push({
            id: c.id,
            guestName: c.guestName,
            content: c.content,
            createdAt: c.createdAt,
          });
          commentsByPhoto.set(c.photoId, list);
        }
      }
    }

    const photosWithComments = results.map((p) => ({
      ...p,
      recentComments: commentsByPhoto.get(p.id) || [],
    }));

    return NextResponse.json({
      photos: photosWithComments,
      timestamp: Date.now(),
      event: {
        title: event.title,
        slug: event.slug,
        isUploadClosed: event.isUploadClosed,
        uploadDeadline: event.uploadDeadline,
      },
    });
  } catch (error) {
    console.error("Error fetching photos:", error);
    return NextResponse.json({ error: "Erro ao carregar fotos" }, { status: 500 });
  }
}
