import { notFound } from "next/navigation";
import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getRecentCommentsByPhoto, listEventPhotos } from "@/lib/photo-queries";
import { generateQrCodeDataUrl } from "@/lib/qrcode";
import { SlideshowClient } from "./SlideshowClient";

export const dynamic = "force-dynamic";

const SLIDESHOW_PHOTO_LIMIT = 300;

interface SlideshowPageProps {
  params: Promise<{ slug: string }>;
}

export default async function SlideshowPage({ params }: SlideshowPageProps) {
  const { slug } = await params;


  const [event] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
  if (!event) {
    notFound();
  }

  // The slideshow cycles through the newest photos; it keeps polling for more
  const { photos: approvedPhotos } = await listEventPhotos({
    eventId: event.id,
    status: "approved",
    limit: SLIDESHOW_PHOTO_LIMIT,
  });
  const commentsByPhoto = await getRecentCommentsByPhoto(approvedPhotos.map((p) => p.id));

  const formattedPhotos = approvedPhotos.map((p) => ({
    id: p.id,
    url: p.url,
    guestName: p.guestName,
    message: p.message,
    mediaType: p.mediaType,
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
