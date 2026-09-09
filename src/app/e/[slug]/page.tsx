import { notFound } from "next/navigation";
import Link from "next/link";
import { db, ensureSchema } from "@/db";
import { events, tables, photos } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { MonogramLogo } from "@/components/MonogramLogo";
import { GuestUploadModal } from "@/components/GuestUploadModal";
import { LiveGalleryView, PhotoItem } from "@/components/LiveGalleryView";
import { HowItWorksModal } from "@/components/HowItWorksModal";
import { Tv, Sparkles, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

interface EventPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string }>;
}

export default async function EventPage({ params, searchParams }: EventPageProps) {
  const { slug } = await params;
  const { table: tableParam } = await searchParams;

  await ensureSchema();

  const [event] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
  if (!event) {
    notFound();
  }

  // Resolve table if specified in query param (either by table ID or identifier match)
  let currentTable: typeof tables.$inferSelect | undefined;
  if (tableParam) {
    const [tableById] = await db.select().from(tables).where(eq(tables.id, tableParam)).limit(1);
    if (tableById && tableById.eventId === event.id) {
      currentTable = tableById;
    } else {
      const [tableByName] = await db
        .select()
        .from(tables)
        .where(and(eq(tables.eventId, event.id), eq(tables.identifier, tableParam)))
        .limit(1);
      if (tableByName) currentTable = tableByName;
    }
  }

  // Initial approved photos
  const rawPhotos = await db
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
    })
    .from(photos)
    .leftJoin(tables, eq(photos.tableId, tables.id))
    .where(and(eq(photos.eventId, event.id), eq(photos.status, "approved")))
    .orderBy(desc(photos.createdAt));

  const formattedPhotos: PhotoItem[] = rawPhotos.map((p) => ({
    id: p.id,
    url: p.url,
    guestName: p.guestName,
    message: p.message,
    status: p.status,
    createdAt: p.createdAt ? new Date(p.createdAt).getTime() : 0,
    tableId: p.tableId,
    tableIdentifier: p.tableIdentifier,
    likeCount: p.likeCount || 0,
    commentCount: p.commentCount || 0,
  }));

  const isClosed =
    event.isUploadClosed ||
    Boolean(event.uploadDeadline && new Date() > new Date(event.uploadDeadline));

  return (
    <div className="min-h-screen flex flex-col items-center pb-24 px-4 sm:px-6">
      {/* Top Navbar */}
      <header className="w-full max-w-4xl py-4 flex items-center justify-between border-b border-[#cb7d87]/20">
        <Link href="/" className="flex items-center gap-2 text-[#5a6248] hover:text-[#cb7d87] transition-colors">
          <MonogramLogo size={36} color="#cb7d87" />
          <span className="font-serif text-lg font-medium tracking-wide">Photo Party</span>
        </Link>

        <div className="flex items-center gap-2">
          <HowItWorksModal trigger="navbar" />
          <Link
            href={`/e/${event.slug}/slideshow`}
            target="_blank"
            className="flex items-center gap-1.5 text-xs text-[#5a6248] hover:text-[#cb7d87] bg-[#fffaf5] px-3 py-1.5 rounded-full border border-[#cb7d87]/20 shadow-xs transition-colors"
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Modo Telão</span>
          </Link>
          <Link
            href={`/e/${event.slug}/admin?key=${event.hostKey}`}
            className="text-[11px] text-[#7c8764] hover:text-[#cb7d87] px-2 py-1 transition-colors"
          >
            Painel
          </Link>
        </div>
      </header>

      {/* Event Header Banner */}
      <div className="w-full max-w-3xl text-center mt-8 mb-8">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-[#cb7d87]/15 mb-3">
          <MonogramLogo size={56} color="#cb7d87" />
        </div>

        <h1 className="font-serif text-4xl sm:text-5xl text-[#5a6248] font-light tracking-tight">
          {event.title}
        </h1>

        {/* Table indicator badge if scanned from a table */}
        {currentTable ? (
          <div className="inline-flex items-center gap-2 mt-3 px-4 py-1.5 bg-[#cb7d87]/15 border border-[#cb7d87]/30 rounded-full text-xs font-semibold text-[#832d3b]">
            <Sparkles className="w-3.5 h-3.5 text-[#cb7d87]" />
            <span>Participando da <strong>{currentTable.identifier}</strong></span>
          </div>
        ) : (
          <p className="text-xs text-[#7c8764] mt-2">
            Galeria compartilhada ao vivo da festa. Envie suas fotos e celebre conosco!
          </p>
        )}

        {/* Closed upload warning banner */}
        {isClosed && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#832d3b] bg-[#fbead6] border border-[#cb7d87]/30 p-2.5 rounded-xl max-w-md mx-auto">
            <Clock className="w-4 h-4" />
            <span>Os envios foram encerrados. Você ainda pode ver e baixar as fotos!</span>
          </div>
        )}
      </div>

      {/* Live Gallery Grid */}
      <div className="w-full max-w-4xl">
        <LiveGalleryView slug={event.slug} initialPhotos={formattedPhotos} />
      </div>

      {/* Floating Upload Action Button and Modal */}
      <GuestUploadModal
        slug={event.slug}
        tableId={currentTable?.id}
        tableName={currentTable?.identifier}
        isUploadClosed={isClosed}
      />
    </div>
  );
}
