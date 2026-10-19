"use client";

import React, { useState } from "react";
import { Heart, Trash2 } from "lucide-react";
import type { PhotoItem } from "@/components/LiveGalleryView";

function VideoGridThumbnail({ url }: { url: string }) {
  const [durationText, setDurationText] = useState("0:06");

  return (
    <>
      <video
        src={url}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        onLoadedMetadata={(e) => {
          const dur = Math.round(e.currentTarget.duration || 6);
          const m = Math.floor(dur / 60);
          const s = String(dur % 60).padStart(2, "0");
          setDurationText(`${m}:${s}`);
        }}
        className="w-full h-full object-cover pointer-events-none"
      />
      {/* Video duration pill (only on videos) */}
      <span className="absolute top-1.5 right-1.5 z-10 text-[11px] font-semibold bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded-full shadow-xs pointer-events-none">
        {durationText}
      </span>
    </>
  );
}

interface PhotoGridItemProps {
  photo: PhotoItem;
  isAnimatingHeart: boolean;
  canDelete: boolean;
  onOpen: () => void;
  onRequestDelete: () => void;
}

export function PhotoGridItem({
  photo,
  isAnimatingHeart,
  canDelete,
  onOpen,
  onRequestDelete,
}: PhotoGridItemProps) {
  const description = [
    photo.mediaType === "video" ? "Vídeo" : "Foto",
    photo.guestName ? `de ${photo.guestName}` : null,
    photo.tableIdentifier ? `· ${photo.tableIdentifier}` : null,
    photo.likeCount ? `· ${photo.likeCount} ${photo.likeCount === 1 ? "curtida" : "curtidas"}` : null,
    photo.isSample ? "(exemplo)" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-none sm:rounded-2xl sm:shadow-xs hover:sm:shadow-lg bg-gray-100 group select-none">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Abrir ${description}`}
        className="absolute inset-0 w-full h-full cursor-pointer active:scale-[0.98] transition-transform focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-marsala-ink"
      >
        {/* Media Container */}
        {photo.mediaType === "video" ? (
          <VideoGridThumbnail url={photo.url} />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={photo.url}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover motion-safe:group-hover:scale-105 transition-transform duration-300"
          />
        )}
      </button>

      {/* Double Tap Floating Heart Animation */}
      {isAnimatingHeart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30" aria-hidden="true">
          <div className="motion-safe:animate-ping duration-700">
            <Heart className="w-14 h-14 text-rose-500 fill-rose-500 drop-shadow-xl" />
          </div>
        </div>
      )}

      {photo.isSample && (
        <span className="absolute top-1.5 left-1.5 z-10 text-[11px] font-semibold bg-white/90 text-gray-800 px-2 py-0.5 rounded-full shadow-xs pointer-events-none" aria-hidden="true">
          Exemplo
        </span>
      )}

      {/* Table Identifier (bottom-left) */}
      {photo.tableIdentifier && (
        <span className="absolute bottom-1.5 left-1.5 z-10 text-[11px] uppercase tracking-wider font-semibold bg-black/65 text-white px-1.5 py-0.5 rounded-md backdrop-blur-xs shadow-xs max-w-[70px] truncate pointer-events-none" aria-hidden="true">
          {photo.tableIdentifier}
        </span>
      )}

      {/* Likes Count (bottom-right if > 0) */}
      {(photo.likeCount || 0) > 0 && (
        <span className="absolute bottom-1.5 right-1.5 z-10 flex items-center gap-1 text-[11px] font-semibold bg-black/60 text-white px-1.5 py-0.5 rounded-md backdrop-blur-xs shadow-xs pointer-events-none" aria-hidden="true">
          <Heart
            className={`w-2.5 h-2.5 ${
              photo.hasLiked ? "text-rose-500 fill-rose-500" : "text-rose-400 fill-rose-400"
            }`}
          />
          <span>{photo.likeCount}</span>
        </span>
      )}

      {/* Owner delete: always visible on touch screens, on hover/focus with a mouse */}
      {canDelete && (
        <button
          type="button"
          onClick={onRequestDelete}
          aria-label={`Apagar ${description}`}
          title="Apagar foto"
          className="absolute top-1 left-1 z-20 p-2 rounded-full bg-rose-700 text-white shadow-sm sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity active:scale-95"
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
