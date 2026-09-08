"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Download, X, Heart, MessageSquare, Sparkles, RefreshCw, Calendar, MapPin } from "lucide-react";

export interface PhotoItem {
  id: string;
  url: string;
  guestName: string | null;
  message: string | null;
  status: string;
  createdAt: string | number;
  tableId: string | null;
  tableIdentifier: string | null;
}

interface LiveGalleryViewProps {
  slug: string;
  initialPhotos?: PhotoItem[];
}

export function LiveGalleryView({ slug, initialPhotos = [] }: LiveGalleryViewProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>(initialPhotos);
  const [activePhoto, setActivePhoto] = useState<PhotoItem | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>("all");
  const [lastTimestamp, setLastTimestamp] = useState<number>(Date.now());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Fetch photos
  const fetchLatestPhotos = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${slug}/photos`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.photos)) {
          setPhotos(data.photos);
          setLastTimestamp(data.timestamp || Date.now());
        }
      }
    } catch (e) {
      console.warn("Polling error:", e);
    }
  }, [slug]);

  // Periodic polling every 5 seconds for live real-time updates
  useEffect(() => {
    fetchLatestPhotos();
    const interval = setInterval(fetchLatestPhotos, 5000);
    return () => clearInterval(interval);
  }, [fetchLatestPhotos]);

  // Extract unique tables for filtering
  const tableOptions = Array.from(
    new Set(
      photos
        .map((p) => p.tableIdentifier)
        .filter((name): name is string => Boolean(name))
    )
  ).sort();

  const filteredPhotos = selectedTable === "all"
    ? photos
    : photos.filter((p) => p.tableIdentifier === selectedTable);

  const handleDownload = async (photo: PhotoItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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
    } catch (err) {
      window.open(photo.url, "_blank");
    }
  };

  return (
    <div className="w-full">
      {/* Table Filter Tabs */}
      <div className="flex items-center justify-between gap-3 mb-6 overflow-x-auto pb-2 border-b border-[#cb7d87]/20">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedTable("all")}
            className={`text-xs px-4 py-1.5 rounded-full transition-all duration-150 font-medium whitespace-nowrap ${
              selectedTable === "all"
                ? "bg-[#cb7d87] text-[#fffaf5] shadow-sm"
                : "bg-[#fffaf5] text-[#5a6248] hover:bg-[#fbead6] border border-[#cb7d87]/20"
            }`}
          >
            Todas as Fotos ({photos.length})
          </button>
          {tableOptions.map((tName) => (
            <button
              key={tName}
              onClick={() => setSelectedTable(tName)}
              className={`text-xs px-3 py-1.5 rounded-full transition-all duration-150 font-medium whitespace-nowrap ${
                selectedTable === tName
                  ? "bg-[#5a6248] text-[#fbead6] shadow-sm"
                  : "bg-[#fffaf5] text-[#5a6248] hover:bg-[#fbead6] border border-[#5a6248]/20"
              }`}
            >
              {tName}
            </button>
          ))}
        </div>

        <button
          onClick={async () => {
            setIsRefreshing(true);
            await fetchLatestPhotos();
            setTimeout(() => setIsRefreshing(false), 400);
          }}
          className="p-1.5 text-[#5a6248] hover:text-[#cb7d87] rounded-full transition-transform active:rotate-180"
          title="Atualizar galeria"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Photos Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="text-center py-16 px-4 bg-[#fffaf5]/70 rounded-3xl border border-[#cb7d87]/20 max-w-md mx-auto shadow-sm">
          <div className="w-14 h-14 rounded-full bg-[#cb7d87]/15 flex items-center justify-center text-[#cb7d87] mx-auto mb-3">
            <Sparkles className="w-7 h-7" />
          </div>
          <h4 className="font-serif text-2xl text-[#5a6248]">Ainda sem fotos</h4>
          <p className="text-xs text-[#7c8764] mt-1">
            Seja a primeira mesa a compartilhar um momento clicando no botão abaixo!
          </p>
        </div>
      ) : (
        <div className="columns-2 sm:columns-3 md:columns-4 gap-4 space-y-4">
          {filteredPhotos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => setActivePhoto(photo)}
              className="break-inside-avoid group cursor-pointer bg-[#fffaf5] border border-[#cb7d87]/25 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
            >
              {/* Photo Image */}
              <div className="relative overflow-hidden bg-[#fbead6]/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.guestName ? `Foto de ${photo.guestName}` : "Foto do evento"}
                  loading="lazy"
                  className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Table badge pill */}
                {photo.tableIdentifier && (
                  <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wider font-semibold bg-[#5a6248]/85 text-[#fbead6] px-2 py-0.5 rounded-full backdrop-blur-xs shadow-xs">
                    {photo.tableIdentifier}
                  </span>
                )}

                {/* Quick download icon overlay */}
                <button
                  onClick={(e) => handleDownload(photo, e)}
                  aria-label="Baixar foto"
                  className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-[#cb7d87] transition-opacity"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Dedication / Guest info card */}
              {(photo.guestName || photo.message) && (
                <div className="p-3 border-t border-[#cb7d87]/15 bg-[#fffaf5]">
                  {photo.guestName && (
                    <p className="text-xs font-semibold text-[#cb7d87] truncate">
                      {photo.guestName}
                    </p>
                  )}
                  {photo.message && (
                    <p className="text-[11px] text-[#49503b] italic mt-0.5 line-clamp-2 leading-relaxed">
                      &ldquo;{photo.message}&rdquo;
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox / Fullscreen Modal */}
      {activePhoto && (
        <div
          onClick={() => setActivePhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full bg-[#fffaf5] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh]"
          >
            {/* Header / Actions bar */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#cb7d87]/20 bg-[#fffaf5]">
              <div className="flex items-center gap-2">
                {activePhoto.tableIdentifier && (
                  <span className="text-xs font-semibold bg-[#5a6248] text-[#fbead6] px-2.5 py-0.5 rounded-full">
                    {activePhoto.tableIdentifier}
                  </span>
                )}
                {activePhoto.guestName && (
                  <span className="text-sm font-serif font-medium text-[#cb7d87]">
                    Por {activePhoto.guestName}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(activePhoto)}
                  className="flex items-center gap-1.5 text-xs font-medium bg-[#cb7d87] hover:bg-[#b86a76] text-white px-3 py-1.5 rounded-full shadow-sm transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar</span>
                </button>
                <button
                  onClick={() => setActivePhoto(null)}
                  className="p-1.5 text-[#5a6248] hover:text-[#cb7d87] rounded-full transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Photo View */}
            <div className="flex-1 overflow-auto bg-black flex items-center justify-center min-h-[300px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePhoto.url}
                alt={activePhoto.guestName || "Foto"}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>

            {/* Dedication footer */}
            {activePhoto.message && (
              <div className="p-4 bg-[#fbead6]/50 border-t border-[#cb7d87]/20 text-center">
                <p className="font-serif text-lg text-[#5a6248] italic">
                  &ldquo;{activePhoto.message}&rdquo;
                </p>
                {activePhoto.guestName && (
                  <p className="text-xs text-[#cb7d87] font-semibold mt-1">
                    — {activePhoto.guestName}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
