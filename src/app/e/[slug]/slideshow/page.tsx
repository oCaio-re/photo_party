import { notFound } from "next/navigation";
import { db } from "@/db";
import { events, tables, photos } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateQrCodeDataUrl } from "@/lib/qrcode";
import { SlideshowClient } from "./SlideshowClient";

export const dynamic = "force-dynamic";

interface SlideshowPageProps {
  params: Promise<{ slug: string }>;
}

export default async function SlideshowPage({ params }: SlideshowPageProps) {
  const { slug } = await params;

  const event = db.select().from(events).where(eq(events.slug, slug)).get();
  if (!event) {
    notFound();
  }

  const approvedPhotos = db
    .select({
      id: photos.id,
      url: photos.url,
      guestName: photos.guestName,
      message: photos.message,
      createdAt: photos.createdAt,
      tableIdentifier: tables.identifier,
    })
    .from(photos)
    .leftJoin(tables, eq(photos.tableId, tables.id))
    .where(and(eq(photos.eventId, event.id), eq(photos.status, "approved")))
    .orderBy(desc(photos.createdAt))
    .all();

  const formattedPhotos = approvedPhotos.map((p) => ({
    id: p.id,
    url: p.url,
    guestName: p.guestName,
    message: p.message,
    tableIdentifier: p.tableIdentifier,
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
