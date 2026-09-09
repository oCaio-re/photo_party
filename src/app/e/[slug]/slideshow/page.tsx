import { notFound } from "next/navigation";
import { db, ensureSchema } from "@/db";
import { events, tables, photos, photoComments } from "@/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { generateQrCodeDataUrl } from "@/lib/qrcode";
import { SlideshowClient } from "./SlideshowClient";

export const dynamic = "force-dynamic";

interface SlideshowPageProps {
  params: Promise<{ slug: string }>;
}

export default async function SlideshowPage({ params }: SlideshowPageProps) {
  const { slug } = await params;

  await ensureSchema();

  const [event] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
  if (!event) {
    notFound();
  }

  const approvedPhotos = await db
    .select({
      id: photos.id,
      url: photos.url,
      guestName: photos.guestName,
      message: photos.message,
      createdAt: photos.createdAt,
      tableIdentifier: tables.identifier,
      likeCount: sql<number>`(SELECT COUNT(*) FROM photo_likes WHERE photo_likes.photo_id = ${photos.id})`.mapWith(Number),
    })
    .from(photos)
    .leftJoin(tables, eq(photos.tableId, tables.id))
    .where(and(eq(photos.eventId, event.id), eq(photos.status, "approved")))
    .orderBy(desc(photos.createdAt));

  const photoIds = approvedPhotos.map((p) => p.id);
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

  const formattedPhotos = approvedPhotos.map((p) => ({
    id: p.id,
    url: p.url,
    guestName: p.guestName,
    message: p.message,
    tableIdentifier: p.tableIdentifier,
    likeCount: p.likeCount || 0,
    recentComments: commentsByPhoto.get(p.id) || [],
  }));

  // Generate generic event QR code for the corner
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:3000`;
  const eventUrl = `${baseUrl}/e/${event.slug}`;
  const qrCodeDataUrl = await generateQrCodeDataUrl(eventUrl);

  return (
    <SlideshowClient
      slug={event.slug}
      eventTitle={event.title}
      initialPhotos={formattedPhotos}
      qrCodeDataUrl={qrCodeDataUrl}
    />
  );
}
