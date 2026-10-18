import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { events, tables, photos } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { parseMomentsConfig } from "@/lib/moments";
import { getAdminSession } from "@/lib/auth";
import { HostAdminClient } from "./HostAdminClient";

export const dynamic = "force-dynamic";

interface AdminPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ key?: string }>;
}

export default async function AdminPage({ params, searchParams }: AdminPageProps) {
  const { slug } = await params;
  const { key } = await searchParams;

  const session = await getAdminSession();

  const [event] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
  if (!event) {
    notFound();
  }

  const isAuthorized = Boolean(
    (session && session.role === "host") || (key && key === event.hostKey)
  );

  if (!isAuthorized) {
    redirect("/admin");
  }

  // Initial data
  const allTables = await db.select().from(tables).where(eq(tables.eventId, event.id));
  const allPhotos = await db
    .select({
      id: photos.id,
      url: photos.url,
      guestName: photos.guestName,
      message: photos.message,
      status: photos.status,
      moment: photos.moment,
      createdAt: photos.createdAt,
      tableId: photos.tableId,
      tableIdentifier: tables.identifier,
      likeCount: sql<number>`(SELECT COUNT(*) FROM photo_likes WHERE photo_likes.photo_id = ${photos.id})`.mapWith(Number),
      commentCount: sql<number>`(SELECT COUNT(*) FROM photo_comments WHERE photo_comments.photo_id = ${photos.id})`.mapWith(Number),
    })
    .from(photos)
    .leftJoin(tables, eq(photos.tableId, tables.id))
    .where(eq(photos.eventId, event.id))
    .orderBy(desc(photos.createdAt));

  const formattedPhotos = allPhotos.map((p) => ({
    id: p.id,
    url: p.url,
    guestName: p.guestName,
    message: p.message,
    status: p.status,
    moment: p.moment,
    createdAt: p.createdAt ? new Date(p.createdAt).getTime() : 0,
    tableId: p.tableId,
    tableIdentifier: p.tableIdentifier,
    likeCount: p.likeCount || 0,
    commentCount: p.commentCount || 0,
  }));

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-16 px-3 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
      <HostAdminClient
        event={{
          id: event.id,
          slug: event.slug,
          title: event.title,
          hostKey: event.hostKey,
          moderationPolicy: event.moderationPolicy,
          uploadDeadline: event.uploadDeadline ? new Date(event.uploadDeadline).toISOString() : null,
          isUploadClosed: event.isUploadClosed,
        }}
        initialTables={allTables}
        initialPhotos={formattedPhotos}
        initialMoments={parseMomentsConfig(event.momentsConfig)}
        initialAuthorized={isAuthorized}
        providedKey={key || event.hostKey}
        loggedUser={session?.username}
      />
    </div>
  );
}
