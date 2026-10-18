import { notFound } from "next/navigation";
import { db } from "@/db";
import { events, tables } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getGalleryFacets, listEventPhotos } from "@/lib/photo-queries";
import { GuestUploadModal } from "@/components/GuestUploadModal";
import { LiveGalleryView, PhotoItem } from "@/components/LiveGalleryView";
import { parseMomentsConfig } from "@/lib/moments";
import { Clock } from "lucide-react";

export const dynamic = "force-dynamic";

interface EventPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string }>;
}

export default async function EventPage({ params, searchParams }: EventPageProps) {
  const { slug } = await params;
  const { table: tableParam } = await searchParams;


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

  // First page of approved photos; the gallery loads older pages on scroll
  const [{ photos: rawPhotos, nextCursor }, facets] = await Promise.all([
    listEventPhotos({ eventId: event.id, status: "approved" }),
    getGalleryFacets(event.id),
  ]);

  const formattedPhotos: PhotoItem[] = rawPhotos.map((p) => ({
    id: p.id,
    url: p.url,
    guestName: p.guestName,
    message: p.message,
    status: p.status,
    createdAt: p.createdAt.getTime(),
    tableId: p.tableId,
    tableIdentifier: p.tableIdentifier,
    questId: p.questId,
    questTitle: p.questTitle,
    mediaType: p.mediaType,
    moment: p.moment,
    likeCount: p.likeCount || 0,
    commentCount: p.commentCount || 0,
  }));

  const moments = parseMomentsConfig(event.momentsConfig);

  const isClosed =
    event.isUploadClosed ||
    Boolean(event.uploadDeadline && new Date() > new Date(event.uploadDeadline));

  return (
    <main className="min-h-screen bg-white text-gray-900 w-full flex flex-col items-center">
      {/* Closed upload warning banner */}
      {isClosed && (
        <div className="w-full max-w-md sm:max-w-3xl md:max-w-5xl mt-3 mb-1 px-4">
          <div className="flex items-center justify-center gap-2 text-xs text-[#832d3b] bg-rose-50 border border-[#cb7d87]/30 p-2.5 rounded-2xl shadow-xs">
            <Clock className="w-4 h-4" />
            <span>Os envios foram encerrados. Você ainda pode ver e baixar as fotos!</span>
          </div>
        </div>
      )}

      {/* Main Hub & Live Gallery (Full Mobile Experience) */}
      <div className="w-full">
        <LiveGalleryView
          slug={event.slug}
          title={event.title}
          tableName={currentTable?.identifier}
          initialPhotos={formattedPhotos}
          initialCursor={nextCursor}
          initialFacets={facets}
          momentsConfig={moments}
        />
      </div>

      {/* Centered Floating Upload Action Button and Modal */}
      <GuestUploadModal
        slug={event.slug}
        tableId={currentTable?.id}
        tableName={currentTable?.identifier}
        isUploadClosed={isClosed}
        momentsConfig={moments}
      />
    </main>
  );
}
