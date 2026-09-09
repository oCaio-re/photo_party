import { notFound } from "next/navigation";
import { db, ensureSchema } from "@/db";
import { events, tables, photos } from "@/db/schema";
import { eq, and, asc, sql } from "drizzle-orm";
import { generateQrCodeDataUrl } from "@/lib/qrcode";
import { GuestbookClient, GuestbookEntry } from "./GuestbookClient";

export const dynamic = "force-dynamic";

interface GuestbookPageProps {
  params: Promise<{ slug: string }>;
}

export default async function GuestbookPage({ params }: GuestbookPageProps) {
  const { slug } = await params;

  await ensureSchema();

  const [event] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
  if (!event) {
    notFound();
  }

  // Fetch approved memories for the guestbook (chronological order of the wedding celebration)
  const approvedMedia = await db
    .select({
      id: photos.id,
      url: photos.url,
      guestName: photos.guestName,
      message: photos.message,
      mediaType: photos.mediaType,
      questTitle: photos.questTitle,
      createdAt: photos.createdAt,
      tableIdentifier: tables.identifier,
      likeCount: sql<number>`(SELECT COUNT(*) FROM photo_likes WHERE photo_likes.photo_id = ${photos.id})`.mapWith(Number),
      commentCount: sql<number>`(SELECT COUNT(*) FROM photo_comments WHERE photo_comments.photo_id = ${photos.id})`.mapWith(Number),
    })
    .from(photos)
    .leftJoin(tables, eq(photos.tableId, tables.id))
    .where(and(eq(photos.eventId, event.id), eq(photos.status, "approved")))
    .orderBy(asc(photos.createdAt));

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const eventUrl = `${baseUrl}/e/${event.slug}`;
  const eventQrCodeUrl = await generateQrCodeDataUrl(eventUrl);

  // Generate QR codes for any video clips so readers of the printed book can watch them with sound!
  const entries: GuestbookEntry[] = await Promise.all(
    approvedMedia.map(async (item) => {
      const isVideo = item.mediaType === "video";
      let videoQrCodeUrl: string | null = null;

      if (isVideo) {
        // Direct media URL or photo view URL
        const videoLink = `${baseUrl}/e/${event.slug}#photo-${item.id}`;
        try {
          videoQrCodeUrl = await generateQrCodeDataUrl(videoLink);
        } catch {
          videoQrCodeUrl = null;
        }
      }

      return {
        id: item.id,
        url: item.url,
        mediaType: (item.mediaType as "photo" | "video") || "photo",
        guestName: item.guestName,
        message: item.message,
        tableIdentifier: item.tableIdentifier,
        questTitle: item.questTitle,
        likeCount: item.likeCount || 0,
        commentCount: item.commentCount || 0,
        createdAt: item.createdAt,
        videoQrCodeUrl,
      };
    })
  );

  const formattedEventDate = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
  }).format(event.createdAt);

  return (
    <GuestbookClient
      slug={event.slug}
      eventTitle={event.title}
      entries={entries}
      eventQrCodeUrl={eventQrCodeUrl}
      formattedEventDate={formattedEventDate}
    />
  );
}
