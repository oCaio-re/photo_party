"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { X, ChevronLeft, Plus, Clock, Camera, Loader2 } from "lucide-react";
import { EventHeroHeader } from "@/components/EventHeroHeader";
import { PhotoQuestsHub } from "@/components/PhotoQuestsHub";
import { EventChatView } from "@/components/EventChatView";
import { SpotlightTour } from "@/components/SpotlightTour";
import { HowItWorksModal } from "@/components/HowItWorksModal";
import { PhotoGridItem } from "@/components/gallery/PhotoGridItem";
import { PhotoLightbox } from "@/components/gallery/PhotoLightbox";
import { DeletePhotoDialog } from "@/components/gallery/DeletePhotoDialog";
import { GuestNameDialog } from "@/components/gallery/GuestNameDialog";
import {
  GalleryFilterBar,
  GalleryFilters,
  DEFAULT_GALLERY_FILTERS,
} from "@/components/gallery/GalleryFilterBar";
import { useGalleryPhotos } from "@/hooks/useGalleryPhotos";
import type { GalleryFacets } from "@/lib/photo-queries";
import { useGuestIdentity } from "@/hooks/useGuestIdentity";
import { WeddingMomentConfig, DEFAULT_WEDDING_MOMENTS } from "@/lib/moments";

export interface PhotoItem {
  id: string;
  url: string;
  guestName: string | null;
  message: string | null;
  mediaType?: "photo" | "video";
  moment?: string | null;
  status: string;
  createdAt: string | number;
  tableId: string | null;
  tableIdentifier: string | null;
  questId?: string | null;
  questTitle?: string | null;
  likeCount?: number;
  commentCount?: number;
  hasLiked?: boolean;
  canDelete?: boolean;
  /** Placeholder shown while the Event has no photos yet; never sent to the API. */
  isSample?: boolean;
}

export interface CommentItem {
  id: string;
  photoId: string;
  guestName: string;
  content: string;
  createdAt: string | number;
  canDelete?: boolean;
}

type MainTab = "hub" | "gallery" | "quests" | "chat";

// Tabs live in the URL (?aba=) so the phone's back gesture moves between them instead of leaving the Event
const TAB_PARAM = "aba";
const TAB_SLUGS: Record<Exclude<MainTab, "hub">, string> = { gallery: "fotos", quests: "desafios", chat: "recados" };

function tabFromParam(value: string | null): MainTab {
  const match = (Object.entries(TAB_SLUGS) as Array<[MainTab, string]>).find(([, slug]) => slug === value);
  return match ? match[0] : "hub";
}

function urlForTab(tab: MainTab): string {
  const url = new URL(window.location.href);
  if (tab === "hub") url.searchParams.delete(TAB_PARAM);
  else url.searchParams.set(TAB_PARAM, TAB_SLUGS[tab]);
  return `${url.pathname}${url.search}${url.hash}`;
}

interface LiveGalleryViewProps {
  slug: string;
  title?: string;
  tableName?: string;
  initialPhotos?: PhotoItem[];
  /** Pagination cursor for the page after `initialPhotos` (null when everything is loaded). */
  initialCursor?: string | null;
  /** Event-wide counts and filter options (independent of loaded pages). */
  initialFacets?: GalleryFacets;
  momentsConfig?: WeddingMomentConfig[];
}

// Sample photos shown (and labelled "Exemplo") until the first real photo arrives; no invented engagement
const DEFAULT_STOCK_PHOTOS: PhotoItem[] = [
  {
    id: "stock-1",
    url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80",
    guestName: "Banquete",
    message: "Mesa impecável e jantar maravilhoso! Parabéns Caio & Sarah! 🥂",
    status: "approved",
    moment: "jantar",
    createdAt: new Date("2026-12-11T20:55:00-03:00").getTime(),
    tableId: null,
    tableIdentifier: "Mesa 01",
    likeCount: 0,
    commentCount: 0,
    isSample: true,
  },
  {
    id: "stock-2",
    url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80",
    guestName: "Padrinhos",
    message: "Um brinde ao amor eterno de Caio & Sarah! ✨💍",
    status: "approved",
    moment: "recepcao",
    createdAt: new Date("2026-12-11T21:05:00-03:00").getTime(),
    tableId: null,
    tableIdentifier: "Mesa 02",
    likeCount: 0,
    commentCount: 0,
    isSample: true,
  },
  {
    id: "stock-3",
    url: "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=800&q=80",
    guestName: "Amigos",
    message: "Pista de dança inesquecível com muitas luzes e alegria! 🔥✨",
    status: "approved",
    moment: "festa",
    createdAt: new Date("2026-12-11T21:20:00-03:00").getTime(),
    tableId: null,
    tableIdentifier: "Pista",
    likeCount: 0,
    commentCount: 0,
    isSample: true,
  },
  {
    id: "stock-4",
    url: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=800&q=80",
    guestName: "Cerimonial",
    message: "Decoração dos sonhos para esta celebração!",
    status: "approved",
    moment: "cerimonia",
    createdAt: new Date("2026-12-11T22:00:00-03:00").getTime(),
    tableId: null,
    tableIdentifier: "Decoração",
    likeCount: 0,
    commentCount: 0,
    isSample: true,
  },
  {
    id: "stock-5",
    url: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=800&q=80",
    guestName: "Fotografia",
    message: "As alianças e o buquê mais lindos! 🤍",
    status: "approved",
    moment: "bolo",
    createdAt: new Date("2026-12-11T22:55:00-03:00").getTime(),
    tableId: null,
    tableIdentifier: "Alianças",
    likeCount: 0,
    commentCount: 0,
    isSample: true,
  },
  {
    id: "stock-6",
    url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800&q=80",
    guestName: "Família",
    message: "Noite abençoada e inesquecível! Viva os noivos!",
    status: "approved",
    moment: "encerramento",
    createdAt: new Date("2026-12-11T23:15:00-03:00").getTime(),
    tableId: null,
    tableIdentifier: "Família",
    likeCount: 0,
    commentCount: 0,
    isSample: true,
  },
];

/** Loads the next page when scrolled into view (with a button fallback). */
function LoadMoreSentinel({ isLoading, onLoadMore }: { isLoading: boolean; onLoadMore: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMore();
      },
      { rootMargin: "400px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [onLoadMore]);

  return (
    <div ref={ref} className="py-6 flex justify-center">
      <button
        type="button"
        onClick={onLoadMore}
        disabled={isLoading}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-60 cursor-pointer"
      >
        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {isLoading ? "Carregando..." : "Carregar mais fotos"}
      </button>
    </div>
  );
}

function StickyTitleBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 py-3 sm:py-4 px-4 sm:px-2 flex items-center justify-between mb-4 sm:mb-6">
      <button
        onClick={onBack}
        className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100 text-gray-900 transition-colors cursor-pointer"
        title="Voltar ao início"
        aria-label="Voltar ao início"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <span className="font-bold text-base sm:text-lg md:text-xl tracking-tight text-gray-900">{title}</span>
      <div className="w-8" />
    </div>
  );
}

/** Server query for the active filters ("" = default newest-first view, as server-rendered). */
function buildFilterQuery(filters: GalleryFilters, moments: WeddingMomentConfig[]): string {
  const params = new URLSearchParams();
  const { category, table, quest, sort } = filters;
  if (table !== "all") params.set("table", table);
  if (quest !== "all") params.set("quest", quest);
  if (moments.some((m) => m.id === category)) params.set("moment", category);
  if (category === "videos") params.set("media", "video");
  if (category === "quests") params.set("quests", "1");
  if (category === "likes" || sort === "likes") params.set("sort", "likes");
  return params.toString();
}

/** Mirrors the server filters; applied to optimistic/merged data and to the stock placeholders. */
function filterAndSortPhotos(photos: PhotoItem[], filters: GalleryFilters, moments: WeddingMomentConfig[]) {
  const { category, table, quest, sort } = filters;
  const filtered = photos.filter((p) => {
    if (table !== "all" && p.tableIdentifier !== table) return false;
    if (quest !== "all" && p.questTitle !== quest) return false;
    if (moments.some((m) => m.id === category) && p.moment !== category) return false;
    if (category === "videos" && p.mediaType !== "video") return false;
    if (category === "quests" && !p.questTitle) return false;
    return true;
  });

  return filtered.sort((a, b) => {
    if (category === "likes" || sort === "likes") {
      const diffLikes = (b.likeCount || 0) - (a.likeCount || 0);
      if (diffLikes !== 0) return diffLikes;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function LiveGalleryView({
  slug,
  title = "Caio & Sarah",
  tableName,
  initialPhotos = [],
  initialCursor = null,
  initialFacets,
  momentsConfig = DEFAULT_WEDDING_MOMENTS,
}: LiveGalleryViewProps) {
  const moments = momentsConfig && momentsConfig.length > 0 ? momentsConfig : DEFAULT_WEDDING_MOMENTS;
  const [filters, setFilters] = useState<GalleryFilters>(DEFAULT_GALLERY_FILTERS);
  const filterQuery = buildFilterQuery(filters, moments);
  const { photos, facets, isSwitching, hasMore, isLoadingMore, loadMore, updatePhoto, removePhoto } =
    useGalleryPhotos({
      slug,
      query: filterQuery,
      initialPhotos,
      initialCursor,
      initialFacets,
    });
  const { guestSessionId, guestName, setGuestName, myUploadedPhotoIds, forgetMyPhoto } = useGuestIdentity();

  const searchParams = useSearchParams();
  const mainTab = tabFromParam(searchParams.get(TAB_PARAM));
  // True while the current tab was opened from inside the app, so "back" can pop history
  const openedInAppRef = useRef(false);

  const setMainTab = useCallback((tab: MainTab) => {
    if (tab === tabFromParam(new URLSearchParams(window.location.search).get(TAB_PARAM))) return;
    window.history.pushState(null, "", urlForTab(tab));
    openedInAppRef.current = tab !== "hub";
    window.scrollTo({ top: 0 });
  }, []);

  const goToHub = useCallback(() => {
    if (openedInAppRef.current) {
      openedInAppRef.current = false;
      window.history.back();
    } else {
      // Arrived straight on a tab (shared link): replace so back still leaves as expected
      window.history.replaceState(null, "", urlForTab("hub"));
    }
  }, []);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [showChatNameDialog, setShowChatNameDialog] = useState(false);

  // Photo deletion state
  const [photoToDelete, setPhotoToDelete] = useState<PhotoItem | null>(null);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);
  const [deletePhotoError, setDeletePhotoError] = useState<string | null>(null);

  // Double tap heart animation
  const [animatingHeartPhotoId, setAnimatingHeartPhotoId] = useState<string | null>(null);

  const updateFilters = useCallback((patch: Partial<GalleryFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  // Listen for tab switch requests (e.g. from post-upload celebration)
  useEffect(() => {
    const handleSwitch = (e: Event) => {
      const ce = e as CustomEvent<{ tab?: MainTab }>;
      if (ce.detail?.tab) {
        setMainTab(ce.detail.tab);
      }
    };
    window.addEventListener("photo_party_switch_tab", handleSwitch);
    return () => window.removeEventListener("photo_party_switch_tab", handleSwitch);
  }, [setMainTab]);

  // Toggle Like (Optimistic UI)
  const handleLikeToggle = useCallback(
    async (photo: PhotoItem) => {
      if (photo.isSample) return;
      const currentlyLiked = Boolean(photo.hasLiked);
      const previousCount = photo.likeCount || 0;
      updatePhoto(photo.id, () => ({
        hasLiked: !currentlyLiked,
        likeCount: Math.max(0, previousCount + (currentlyLiked ? -1 : 1)),
      }));

      try {
        const res = await fetch(`/api/events/${slug}/photos/${photo.id}/like`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-guest-session-id": guestSessionId,
          },
          body: JSON.stringify({ guestSessionId }),
        });
        if (res.ok) {
          const data = await res.json();
          updatePhoto(photo.id, () => ({ hasLiked: data.liked, likeCount: data.likeCount }));
        }
      } catch (err) {
        console.error("Failed to toggle like:", err);
        updatePhoto(photo.id, () => ({ hasLiked: currentlyLiked, likeCount: previousCount }));
      }
    },
    [guestSessionId, slug, updatePhoto]
  );

  // Double tap (dblclick) on the expanded photo: heart pop + like
  const handlePhotoDoubleTap = useCallback(
    (photo: PhotoItem) => {
      setAnimatingHeartPhotoId(photo.id);
      setTimeout(() => setAnimatingHeartPhotoId(null), 850);
      if (!photo.hasLiked) {
        handleLikeToggle(photo);
      }
    },
    [handleLikeToggle]
  );

  const canDeletePhoto = (photo: PhotoItem): boolean =>
    Boolean(photo.canDelete || myUploadedPhotoIds.has(photo.id));

  const handleConfirmDeletePhoto = async () => {
    if (!photoToDelete) return;

    try {
      setIsDeletingPhoto(true);
      setDeletePhotoError(null);

      const res = await fetch(
        `/api/events/${slug}/photos/${photoToDelete.id}?guestSessionId=${encodeURIComponent(guestSessionId)}`,
        {
          method: "DELETE",
          headers: guestSessionId ? { "x-guest-session-id": guestSessionId } : {},
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Não foi possível apagar a foto.");
      }

      removePhoto(photoToDelete.id);
      forgetMyPhoto(photoToDelete.id);
      if (activePhotoId === photoToDelete.id) {
        setActivePhotoId(null);
      }
      setPhotoToDelete(null);
    } catch (err: unknown) {
      setDeletePhotoError(err instanceof Error ? err.message : "Erro ao apagar a foto.");
    } finally {
      setIsDeletingPhoto(false);
    }
  };

  const handleDownload = async (photo: PhotoItem) => {
    try {
      const res = await fetch(photo.url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const ext = photo.url.split(".").pop() || "jpg";
      a.download = `foto_${photo.tableIdentifier || "evento"}_${photo.id.slice(0, 6)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(photo.url, "_blank");
    }
  };

  // Stock placeholders only while the Event has no approved photos at all (filtered locally)
  const showStock = facets.totalApproved === 0 && photos.length === 0;
  const combinedPhotos = showStock ? DEFAULT_STOCK_PHOTOS : photos;

  const tableOptions = showStock
    ? Array.from(
        new Set(
          DEFAULT_STOCK_PHOTOS.map((p) => p.tableIdentifier).filter((name): name is string => Boolean(name))
        )
      ).sort()
    : facets.tables;

  const sortedPhotos = filterAndSortPhotos(combinedPhotos, filters, moments);
  const isLoadingFilter = isSwitching && !showStock;
  // Unfiltered views know the Event-wide total; filtered ones count what is loaded
  const isUnfiltered = filterQuery === "" || filterQuery === "sort=likes";
  const sharedCount = !showStock && isUnfiltered ? facets.totalApproved : sortedPhotos.length;

  const activePhoto = activePhotoId ? combinedPhotos.find((p) => p.id === activePhotoId) ?? null : null;
  const activePhotoIndex = activePhoto ? sortedPhotos.findIndex((p) => p.id === activePhoto.id) : -1;
  const prevPhoto = activePhotoIndex > 0 ? sortedPhotos[activePhotoIndex - 1] : null;
  const nextPhoto =
    activePhotoIndex >= 0 && activePhotoIndex < sortedPhotos.length - 1
      ? sortedPhotos[activePhotoIndex + 1]
      : null;

  const selectedMomentObj = moments.find((m) => m.id === filters.category);
  const videoCount = sortedPhotos.filter((p) => p.mediaType === "video").length;

  const handleNavigate = useCallback((photo: PhotoItem) => setActivePhotoId(photo.id), []);
  const handleCloseLightbox = useCallback(() => setActivePhotoId(null), []);
  const handleActivePhotoPatch = useCallback(
    (patch: (photo: PhotoItem) => Partial<PhotoItem>) => {
      if (activePhotoId) updatePhoto(activePhotoId, patch);
    },
    [activePhotoId, updatePhoto]
  );

  return (
    <div className="w-full min-h-screen bg-white text-gray-900 flex flex-col items-center">
      {/* 1. HUB VIEW */}
      {mainTab === "hub" && (
        <div className="w-full max-w-md sm:max-w-3xl md:max-w-4xl lg:max-w-5xl mx-auto pb-24">
          <EventHeroHeader
            slug={slug}
            title={title}
            photos={photos}
            momentCounts={showStock ? undefined : facets.momentCounts}
            momentCovers={facets.momentCovers}
            tableName={tableName}
            activeTab={mainTab}
            onTabChange={(tab) => setMainTab(tab)}
            onSelectCategory={(cat) => {
              updateFilters({
                category: cat,
                ...(cat === "recent" ? { sort: "recent" as const } : {}),
                ...(cat === "likes" ? { sort: "likes" as const } : {}),
              });
            }}
            momentsConfig={moments}
          />
        </div>
      )}

      {/* 2. GALLERY VIEW */}
      {mainTab === "gallery" && (
        <div className="w-full max-w-md sm:max-w-3xl md:max-w-5xl lg:max-w-6xl mx-auto pb-28 px-0 sm:px-4">
          {/* Top Bar: back · title · add */}
          <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 py-3 sm:py-4 px-4 sm:px-2 flex items-center justify-between">
            <button
              onClick={goToHub}
              className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100 text-gray-900 transition-colors cursor-pointer"
              title="Voltar ao início"
              aria-label="Voltar ao início"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-1.5 text-gray-900">
              <span className="font-bold text-base sm:text-lg tracking-tight">{title}</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Photo Bundle export is a Host action (admin panel); Guests save photos one by one */}
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-upload-modal"))}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-800 transition-colors cursor-pointer"
                title="Adicionar foto ou vídeo"
                aria-label="Adicionar foto ou vídeo"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </div>

          <GalleryFilterBar
            filters={filters}
            onChange={updateFilters}
            tableName={tableName}
            tableOptions={tableOptions}
            moments={moments}
          />

          {/* Active Quest Filter Banner */}
          {filters.quest !== "all" && (
            <div className="flex items-center justify-between bg-[#cb7d87]/10 border border-[#cb7d87]/25 px-4 py-2 mx-2 my-2 rounded-2xl text-xs">
              <span className="text-gray-700 font-medium flex items-center gap-1.5">
                <span>🎯 Desafio:</span>
                <strong className="text-marsala-ink font-semibold">{filters.quest}</strong>
              </span>
              <button
                onClick={() => updateFilters({ quest: "all" })}
                className="text-marsala-ink hover:underline font-medium text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Limpar
              </button>
            </div>
          )}

          {isLoadingFilter && (
            <div className="py-20 flex justify-center text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}

          {/* Active Moment Teaser (when a moment tab has 0 photos) */}
          {!isLoadingFilter && selectedMomentObj && sortedPhotos.length === 0 && (
            <div className="mx-4 my-10 p-8 rounded-3xl bg-[#fffaf5] border border-[#cb7d87]/25 text-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-rose-50 border border-[#cb7d87]/30 flex items-center justify-center text-3xl mx-auto mb-3 shadow-xs">
                {selectedMomentObj.icon}
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[11px] text-marsala-ink font-semibold mb-2 border border-[#cb7d87]/20 shadow-2xs">
                <Clock className="w-3.5 h-3.5" />
                <span>{selectedMomentObj.startTime} - {selectedMomentObj.endTime}</span>
              </div>
              <h3 className="font-sans font-bold text-xl text-gray-900 mb-1.5">
                {selectedMomentObj.name}
              </h3>
              <p className="text-xs text-gray-600 max-w-xs mx-auto mb-6 leading-relaxed">
                {selectedMomentObj.description || "Este momento está chegando!"} Seja o primeiro a registrar fotos e vídeos quando começar ✨
              </p>
              <button
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("open-upload-modal", {
                      detail: { moment: selectedMomentObj.id },
                    })
                  )
                }
                className="inline-flex items-center gap-2 bg-marsala-ink hover:bg-marsala-ink-hover active:scale-95 text-white px-6 py-3 rounded-full text-xs font-semibold shadow-md transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Registrar este momento</span>
              </button>
            </div>
          )}

          {/* Empty General Filter State */}
          {!isLoadingFilter && !selectedMomentObj && sortedPhotos.length === 0 && (
            <div className="py-20 text-center text-gray-500">
              <Camera className="w-10 h-10 mx-auto mb-2 opacity-40 text-gray-500" />
              <p className="text-sm font-medium">Nenhuma mídia encontrada nesta categoria</p>
            </div>
          )}

          {showStock && (
            <p className="mx-4 sm:mx-2 mt-3 rounded-2xl bg-[#fffaf5] border border-[#cb7d87]/25 px-4 py-3 text-sm text-gray-700">
              <strong className="font-semibold text-gray-900">Ainda não chegou nenhuma foto.</strong> Estas são fotos de
              exemplo; as dos convidados aparecem aqui assim que forem enviadas.
            </p>
          )}

          {/* Portrait 3:4 Grid on mobile, responsive multi-column with rounded corners on desktop */}
          {!isLoadingFilter && sortedPhotos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-[2px] sm:gap-3 md:gap-4 bg-white pt-1 sm:pt-4">
              {sortedPhotos.map((photo) => (
                <PhotoGridItem
                  key={photo.id}
                  photo={photo}
                  isAnimatingHeart={animatingHeartPhotoId === photo.id}
                  canDelete={canDeletePhoto(photo)}
                  onOpen={() => setActivePhotoId(photo.id)}
                  onRequestDelete={() => setPhotoToDelete(photo)}
                />
              ))}
            </div>
          )}

          {hasMore && <LoadMoreSentinel isLoading={isLoadingMore} onLoadMore={loadMore} />}

          {/* Photos Count Footer */}
          <div className="py-8 text-center select-none">
            <p className="text-xs font-semibold text-gray-700 tracking-wide">
              {sharedCount} {sharedCount === 1 ? "Momento Compartilhado" : "Momentos Compartilhados"}
            </p>
            {hasMore ? (
              <p className="text-[11px] text-gray-500 mt-0.5">Mostrando {sortedPhotos.length} • role para ver mais</p>
            ) : (
              <p className="text-[11px] text-gray-500 mt-0.5">
                {sortedPhotos.length - videoCount} fotos
                {videoCount > 0 && ` • ${videoCount} vídeos`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 3. QUESTS VIEW */}
      {mainTab === "quests" && (
        <div className="w-full max-w-md sm:max-w-3xl md:max-w-4xl lg:max-w-5xl mx-auto pb-28 px-0 sm:px-4">
          <StickyTitleBar title="Desafios" onBack={goToHub} />
          <div className="px-4 sm:px-0">
            <PhotoQuestsHub
              slug={slug}
              onFilterByQuest={(questTitle) => {
                updateFilters({ quest: questTitle, category: "quests" });
                setMainTab("gallery");
              }}
            />
          </div>
        </div>
      )}

      {/* 4. CHAT VIEW */}
      {mainTab === "chat" && (
        <div className="w-full max-w-md sm:max-w-xl md:max-w-2xl mx-auto pb-28 px-0 sm:px-4">
          <StickyTitleBar title="Recados" onBack={goToHub} />
          <div className="px-4 sm:px-0">
            <EventChatView
              slug={slug}
              guestSessionId={guestSessionId}
              guestName={guestName}
              onChangeName={() => setShowChatNameDialog(true)}
            />
          </div>
        </div>
      )}

      {/* Instagram-Style Lightbox Modal */}
      {activePhoto && (
        <PhotoLightbox
          key={activePhoto.id}
          slug={slug}
          photo={activePhoto}
          moments={moments}
          index={activePhotoIndex}
          total={sortedPhotos.length}
          prevPhoto={prevPhoto}
          nextPhoto={nextPhoto}
          isAnimatingHeart={animatingHeartPhotoId === activePhoto.id}
          canDelete={canDeletePhoto(activePhoto)}
          guestSessionId={guestSessionId}
          guestName={guestName}
          onGuestNameChange={setGuestName}
          onNavigate={handleNavigate}
          onClose={handleCloseLightbox}
          onLike={() => handleLikeToggle(activePhoto)}
          onDoubleTap={() => handlePhotoDoubleTap(activePhoto)}
          onRequestDelete={() => setPhotoToDelete(activePhoto)}
          onDownload={() => handleDownload(activePhoto)}
          onPhotoPatch={handleActivePhotoPatch}
        />
      )}

      {/* Delete Photo Confirmation Dialog */}
      {photoToDelete && (
        <DeletePhotoDialog
          isDeleting={isDeletingPhoto}
          error={deletePhotoError}
          onConfirm={handleConfirmDeletePhoto}
          onCancel={() => setPhotoToDelete(null)}
        />
      )}

      {/* Change name from the Event Chat */}
      {showChatNameDialog && (
        <GuestNameDialog
          initialName={guestName}
          onCancel={() => setShowChatNameDialog(false)}
          onSave={(name) => {
            setGuestName(name);
            setShowChatNameDialog(false);
          }}
        />
      )}

      {/* Global First-Time Guest Spotlight Walkthrough */}
      <SpotlightTour />

      {/* Global How It Works Guide Modal */}
      {/* Opens only on request ("Como funciona?"); arriving Guests go straight to the party */}
      <HowItWorksModal trigger="none" autoOpenFirstTime={false} />
    </div>
  );
}
