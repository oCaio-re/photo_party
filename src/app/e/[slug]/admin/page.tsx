import { notFound } from "next/navigation";
import { db } from "@/db";
import { events, tables, photos } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { HostAdminClient } from "./HostAdminClient";

export const dynamic = "force-dynamic";

interface AdminPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ key?: string }>;
}

export default async function AdminPage({ params, searchParams }: AdminPageProps) {
  const { slug } = await params;
  const { key } = await searchParams;

  const event = db.select().from(events).where(eq(events.slug, slug)).get();
  if (!event) {
    notFound();
  }

  // Initial data
  const allTables = db.select().from(tables).where(eq(tables.eventId, event.id)).all();
  const allPhotos = db
    .select({
      id: photos.id,
      url: photos.url,
      guestName: photos.guestName,
      message: photos.message,
      status: photos.status,
      createdAt: photos.createdAt,
      tableId: photos.tableId,
      tableIdentifier: tables.identifier,
    })
    .from(photos)
    .leftJoin(tables, eq(photos.tableId, tables.id))
    .where(eq(photos.eventId, event.id))
    .orderBy(desc(photos.createdAt))
    .all();

  const formattedPhotos = allPhotos.map((p) => ({
    id: p.id,
    url: p.url,
    guestName: p.guestName,
    message: p.message,
    status: p.status,
    createdAt: p.createdAt ? new Date(p.createdAt).getTime() : Date.now(),
    tableId: p.tableId,
    tableIdentifier: p.tableIdentifier,
  }));

  const isAuthorized = Boolean(key && key === event.hostKey);

  return (
    <div className="min-h-screen pb-16 px-4 sm:px-6 max-w-5xl mx-auto">
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
        initialAuthorized={isAuthorized}
        providedKey={key || ""}
      />
    </div>
  );
}
