import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseMomentsConfig } from "@/lib/moments";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import {
  getGalleryFacets,
  getRecentCommentsByPhoto,
  listEventPhotos,
  type PhotoStatus,
} from "@/lib/photo-queries";

function parseTimestamp(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(Number(value));
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Query params:
 * - `since`  (ms): only photos newer than this — cheap incremental polling
 * - `cursor`: pagination cursor, the `nextCursor` of the previous page
 * - `limit`: page size (default 120, max 500)
 * - filters: `table` (identifier), `quest` (title), `moment` (id), `media=video|photo`, `quests=1`
 * - `sort=likes`: most liked first (default: newest first)
 * - `comments=1`: include the latest comments per photo (slideshow)
 * - `status`: host only — 'approved' | 'pending' | 'hidden' | 'all'
 * The first page (no `since`/`cursor`) also carries Event-wide `facets` for the gallery.
 */
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

    // Check host key or admin session
    const authHeader = request.headers.get("authorization");
    const keyParam = searchParams.get("key");
    const providedKey = authHeader?.replace(/^Bearer\s+/i, "") || keyParam;
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const isHost =
      Boolean(providedKey && providedKey === event.hostKey) || Boolean(token && verifySessionToken(token));

    const guestSessionId =
      request.headers.get("x-guest-session-id") ||
      searchParams.get("guestSessionId") ||
      "";

    const requestedStatus = searchParams.get("status");
    let status: PhotoStatus | undefined = "approved"; // Guests only see approved photos
    if (isHost && requestedStatus) {
      status = requestedStatus === "all" ? undefined : (requestedStatus as PhotoStatus);
    }

    const limitParam = Number(searchParams.get("limit"));
    const since = parseTimestamp(searchParams.get("since"));
    const cursor = searchParams.get("cursor");
    const media = searchParams.get("media");
    const { photos: results, nextCursor } = await listEventPhotos({
      eventId: event.id,
      status,
      since,
      cursor,
      tableIdentifier: searchParams.get("table"),
      questTitle: searchParams.get("quest"),
      moment: searchParams.get("moment"),
      mediaType: media === "video" || media === "photo" ? media : null,
      hasQuest: searchParams.get("quests") === "1",
      sort: searchParams.get("sort") === "likes" ? "likes" : "recent",
      limit: Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined,
      guestSessionId,
    });

    const commentsByPhoto =
      searchParams.get("comments") === "1"
        ? await getRecentCommentsByPhoto(results.map((p) => p.id))
        : null;

    const photosWithComments = results.map((p) => {
      const { guestSessionId: photoOwnerSessionId, ...safeProps } = p;
      return {
        ...safeProps,
        canDelete: isHost || (Boolean(guestSessionId) && photoOwnerSessionId === guestSessionId),
        ...(commentsByPhoto ? { recentComments: commentsByPhoto.get(p.id) || [] } : {}),
      };
    });

    return NextResponse.json({
      photos: photosWithComments,
      nextCursor,
      ...(!since && !cursor ? { facets: await getGalleryFacets(event.id) } : {}),
      timestamp: Date.now(),
      event: {
        title: event.title,
        slug: event.slug,
        isUploadClosed: event.isUploadClosed,
        uploadDeadline: event.uploadDeadline,
        momentsConfig: parseMomentsConfig(event.momentsConfig),
      },
    });
  } catch (error) {
    console.error("Error fetching photos:", error);
    return NextResponse.json({ error: "Erro ao carregar fotos" }, { status: 500 });
  }
}
