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
      <span className="absolute top-1.5 right-1.5 z-10 text-[10px] font-semibold bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded-full shadow-xs pointer-events-none">
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
  onDoubleTap: (e: React.MouseEvent | React.TouchEvent) => void;
  onRequestDelete: () => void;
}

export function PhotoGridItem({
  photo,
  isAnimatingHeart,
  canDelete,
  onOpen,
  onDoubleTap,
  onRequestDelete,
}: PhotoGridItemProps) {
  return (
    <div
      onClick={onOpen}
      onDoubleClick={onDoubleTap}
      onTouchEnd={onDoubleTap}
      className="relative aspect-[3/4] overflow-hidden rounded-none sm:rounded-2xl sm:shadow-xs hover:sm:shadow-lg bg-gray-100 cursor-pointer group select-none active:scale-[0.98] transition-all"
    >
      {/* Media Container */}
      {photo.mediaType === "video" ? (
        <VideoGridThumbnail url={photo.url} />
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={photo.url}
          alt={photo.guestName ? `Foto de ${photo.guestName}` : "Foto do evento"}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      )}

      {/* Double Tap Floating Heart Animation */}
      {isAnimatingHeart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="animate-ping duration-700">
            <Heart className="w-14 h-14 text-rose-500 fill-rose-500 drop-shadow-xl" />
          </div>
        </div>
      )}

      {/* Table Identifier (bottom-left) */}
      {photo.tableIdentifier && (
        <span className="absolute bottom-1.5 left-1.5 z-10 text-[9px] uppercase tracking-wider font-semibold bg-black/65 text-white px-1.5 py-0.5 rounded-md backdrop-blur-xs shadow-xs max-w-[70px] truncate pointer-events-none">
          {photo.tableIdentifier}
        </span>
      )}

      {/* Likes Count (bottom-right if > 0) */}
      {(photo.likeCount || 0) > 0 && (
        <span className="absolute bottom-1.5 right-1.5 z-10 flex items-center gap-1 text-[10px] font-semibold bg-black/60 text-white px-1.5 py-0.5 rounded-md backdrop-blur-xs shadow-xs pointer-events-none">
          <Heart
            className={`w-2.5 h-2.5 ${
              photo.hasLiked ? "text-rose-500 fill-rose-500" : "text-rose-400 fill-rose-400"
            }`}
          />
          <span>{photo.likeCount}</span>
        </span>
      )}

      {/* Owner Delete Button on hover */}
      {canDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRequestDelete();
          }}
          aria-label="Apagar foto"
          title="Apagar foto"
          className="absolute top-1.5 left-1.5 z-25 p-1 rounded-full bg-rose-600 text-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity active:scale-95"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
