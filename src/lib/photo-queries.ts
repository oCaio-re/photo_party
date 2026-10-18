import { and, count, desc, eq, gt, inArray, isNotNull, lt, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { photos, tables, photoComments } from "@/db/schema";

export type PhotoStatus = "approved" | "pending" | "hidden";

export const PHOTO_PAGE_SIZE = 120;
const MAX_PAGE_SIZE = 500;

/** Gallery filters applied in SQL, so they cover every Photo and not just loaded pages. */
export interface PhotoFilters {
  tableIdentifier?: string | null;
  questTitle?: string | null;
  moment?: string | null;
  mediaType?: "photo" | "video" | null;
  /** Only Photos tagged with a Photo Quest. */
  hasQuest?: boolean;
  sort?: "recent" | "likes";
}

export interface ListPhotosOptions extends PhotoFilters {
  eventId: string;
  /** Omit to include every status (host views). */
  status?: PhotoStatus;
  /** Only photos created strictly after this instant (incremental polling). */
  since?: Date | null;
  /** Opaque cursor from a previous page's `nextCursor`. */
  cursor?: string | null;
  limit?: number;
  /** Fills `hasLiked` for this Guest. */
  guestSessionId?: string;
}

/**
 * Recent sort pages by creation time ("t:<ms>"); likes sort pages by offset ("o:<n>"),
 * since like counts change between requests and cannot anchor a keyset cursor.
 */
function parseCursor(cursor: string | null | undefined): { before?: Date; offset?: number } {
  if (!cursor) return {};
  const [kind, raw] = cursor.split(":");
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return {};
  if (kind === "t") return { before: new Date(value) };
  if (kind === "o") return { offset: Math.floor(value) };
  return {};
}

/**
 * One page of an Event's Photos with like/comment aggregates, newest first or most liked first.
 * The counts are correlated subqueries served by the photo_id indexes.
 */
export async function listEventPhotos(options: ListPhotosOptions) {
  const { eventId, status, since, guestSessionId, sort = "recent" } = options;
  const limit = Math.min(Math.max(1, options.limit ?? PHOTO_PAGE_SIZE), MAX_PAGE_SIZE);
  const { before, offset = 0 } = parseCursor(options.cursor);

  const conditions = [eq(photos.eventId, eventId)];
  if (status) conditions.push(eq(photos.status, status));
  if (since) conditions.push(gt(photos.createdAt, since));
  if (before && sort === "recent") conditions.push(lt(photos.createdAt, before));
  if (options.tableIdentifier) conditions.push(eq(tables.identifier, options.tableIdentifier));
  if (options.questTitle) conditions.push(eq(photos.questTitle, options.questTitle));
  if (options.moment) conditions.push(eq(photos.moment, options.moment));
  if (options.mediaType === "video") conditions.push(eq(photos.mediaType, "video"));
  if (options.mediaType === "photo") conditions.push(sql`${photos.mediaType} <> 'video'`);
  if (options.hasQuest) conditions.push(isNotNull(photos.questTitle));

  const likeCount = sql<number>`(SELECT COUNT(*) FROM photo_likes WHERE photo_likes.photo_id = ${photos.id})`;

  // Fetch one extra row to know whether another page exists
  const rows = await db
    .select({
      id: photos.id,
      url: photos.url,
      guestName: photos.guestName,
      message: photos.message,
      status: photos.status,
      createdAt: photos.createdAt,
      tableId: photos.tableId,
      tableIdentifier: tables.identifier,
      questId: photos.questId,
      questTitle: photos.questTitle,
      mediaType: photos.mediaType,
      moment: photos.moment,
      guestSessionId: photos.guestSessionId,
      likeCount: likeCount.mapWith(Number),
      commentCount: sql<number>`(SELECT COUNT(*) FROM photo_comments WHERE photo_comments.photo_id = ${photos.id})`.mapWith(Number),
      hasLiked: guestSessionId
        ? sql<boolean>`EXISTS(SELECT 1 FROM photo_likes WHERE photo_likes.photo_id = ${photos.id} AND photo_likes.guest_session_id = ${guestSessionId})`.mapWith(Boolean)
        : sql<boolean>`false`.mapWith(Boolean),
    })
    .from(photos)
    .leftJoin(tables, eq(photos.tableId, tables.id))
    .where(and(...conditions))
    .orderBy(
      ...(sort === "likes"
        ? [desc(likeCount), desc(photos.createdAt), desc(photos.id)]
        : [desc(photos.createdAt), desc(photos.id)])
    )
    .limit(limit + 1)
    .offset(sort === "likes" ? offset : 0);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const oldest = page[page.length - 1];

  let nextCursor: string | null = null;
  if (hasMore && oldest) {
    nextCursor = sort === "likes" ? `o:${offset + page.length}` : `t:${oldest.createdAt.getTime()}`;
  }

  return {
    photos: page.map((p) => ({
      ...p,
      mediaType: (p.mediaType as "photo" | "video") || "photo",
    })),
    nextCursor,
  };
}

export interface GalleryFacets {
  totalApproved: number;
  /** Approved Photos per Wedding Moment. */
  momentCounts: Record<string, number>;
  /** Newest approved Photo URL per Wedding Moment (hub carousel covers). */
  momentCovers: Record<string, string>;
  /** Table identifiers that have at least one approved Photo. */
  tables: string[];
}

/** Event-wide numbers for the gallery hub and filter options, independent of loaded pages. */
export async function getGalleryFacets(eventId: string): Promise<GalleryFacets> {
  const approved = and(eq(photos.eventId, eventId), eq(photos.status, "approved"));

  const [totals, momentRows, coverRows, tableRows] = await Promise.all([
    db.select({ total: count() }).from(photos).where(approved),
    db
      .select({ moment: photos.moment, total: count() })
      .from(photos)
      .where(and(approved, isNotNull(photos.moment)))
      .groupBy(photos.moment),
    db
      .selectDistinctOn([photos.moment], { moment: photos.moment, url: photos.url })
      .from(photos)
      .where(and(approved, isNotNull(photos.moment)))
      .orderBy(photos.moment, desc(photos.createdAt)),
    db
      .selectDistinct({ identifier: tables.identifier })
      .from(photos)
      .innerJoin(tables, eq(photos.tableId, tables.id))
      .where(approved)
      .orderBy(tables.identifier),
  ]);

  return {
    totalApproved: totals[0]?.total ?? 0,
    momentCounts: Object.fromEntries(momentRows.map((r) => [r.moment as string, r.total])),
    momentCovers: Object.fromEntries(coverRows.map((r) => [r.moment as string, r.url])),
    tables: tableRows.map((r) => r.identifier),
  };
}

export interface RecentComment {
  id: string;
  guestName: string;
  content: string;
  createdAt: Date;
}

/** Latest `perPhoto` comments for each Photo, ranked in SQL instead of loading every comment. */
export async function getRecentCommentsByPhoto(photoIds: string[], perPhoto = 4) {
  const byPhoto = new Map<string, RecentComment[]>();
  if (photoIds.length === 0) return byPhoto;

  const ranked = db
    .select({
      id: photoComments.id,
      photoId: photoComments.photoId,
      guestName: photoComments.guestName,
      content: photoComments.content,
      createdAt: photoComments.createdAt,
      rank: sql<number>`row_number() over (partition by ${photoComments.photoId} order by ${photoComments.createdAt} desc)`.as("rank"),
    })
    .from(photoComments)
    .where(inArray(photoComments.photoId, photoIds))
    .as("ranked");

  const rows = await db
    .select()
    .from(ranked)
    .where(lte(ranked.rank, perPhoto))
    .orderBy(ranked.photoId, desc(ranked.createdAt));

  for (const row of rows) {
    const list = byPhoto.get(row.photoId) || [];
    list.push({ id: row.id, guestName: row.guestName, content: row.content, createdAt: row.createdAt });
    byPhoto.set(row.photoId, list);
  }
  return byPhoto;
}
