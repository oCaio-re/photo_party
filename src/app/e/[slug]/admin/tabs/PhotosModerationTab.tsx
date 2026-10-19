"use client";

import React, { useState } from "react";
import { CheckCircle, EyeOff, Heart, MessageSquare, Trash2 } from "lucide-react";
import type { PhotoItem } from "@/components/LiveGalleryView";

type PhotoFilter = "all" | "pending" | "approved" | "hidden";

interface PhotosModerationTabProps {
  slug: string;
  hostKey: string;
  photos: PhotoItem[];
  onPhotoStatusChange: (photoId: string, status: "approved" | "hidden") => void;
  onPhotoDeleted: (photoId: string) => void;
}

export function PhotosModerationTab({
  slug,
  hostKey,
  photos,
  onPhotoStatusChange,
  onPhotoDeleted,
}: PhotosModerationTabProps) {
  const [photoFilter, setPhotoFilter] = useState<PhotoFilter>("all");
  const [photoToDelete, setPhotoToDelete] = useState<PhotoItem | null>(null);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);

  const pendingCount = photos.filter((p) => p.status === "pending").length;
  const approvedCount = photos.filter((p) => p.status === "approved").length;
  const hiddenCount = photos.filter((p) => p.status === "hidden").length;
  const displayedPhotos =
    photoFilter === "all" ? photos : photos.filter((p) => p.status === photoFilter);

  const handlePhotoStatus = async (photoId: string, newStatus: "approved" | "hidden") => {
    try {
      const res = await fetch(`/api/events/${slug}/photos/${photoId}?key=${hostKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        onPhotoStatusChange(photoId, newStatus);
      }
    } catch (err) {
      console.error("Error updating photo status:", err);
    }
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    try {
      setIsDeletingPhoto(true);
      const res = await fetch(`/api/events/${slug}/photos/${photoToDelete.id}?key=${hostKey}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onPhotoDeleted(photoToDelete.id);
        setPhotoToDelete(null);
      }
    } catch (err) {
      console.error("Error deleting photo:", err);
    } finally {
      setIsDeletingPhoto(false);
    }
  };

  return (
    <>
      <div>
        {/* Subfilter pills */}
        <div className="flex items-center gap-1.5 sm:gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setPhotoFilter("all")}
            className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer transition-colors ${
              photoFilter === "all"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Todas ({photos.length})
          </button>
          <button
            onClick={() => setPhotoFilter("pending")}
            className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer transition-colors ${
              photoFilter === "pending"
                ? "bg-amber-500 text-white"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            Pendentes ({pendingCount})
          </button>
          <button
            onClick={() => setPhotoFilter("approved")}
            className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer transition-colors ${
              photoFilter === "approved"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            Aprovadas ({approvedCount})
          </button>
          <button
            onClick={() => setPhotoFilter("hidden")}
            className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer transition-colors ${
              photoFilter === "hidden"
                ? "bg-gray-700 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Ocultas ({hiddenCount})
          </button>
        </div>

        {displayedPhotos.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-3xl border border-gray-100">
            <p className="text-sm font-medium text-gray-500">Nenhuma foto nesta categoria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-4">
            {displayedPhotos.map((photo) => (
              <div
                key={photo.id}
                className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="relative aspect-square bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.guestName || "Foto"}
                    className="w-full h-full object-cover"
                  />
                  <span
                    className={`absolute top-2 left-2 text-[11px] px-2 py-0.5 rounded-full font-semibold uppercase backdrop-blur-xs ${
                      photo.status === "approved"
                        ? "bg-emerald-600/95 text-white"
                        : photo.status === "pending"
                        ? "bg-amber-500/95 text-white"
                        : "bg-gray-800/95 text-white"
                    }`}
                  >
                    {photo.status === "approved"
                      ? "Aprovada"
                      : photo.status === "pending"
                      ? "Pendente"
                      : "Oculta"}
                  </span>
                  {photo.tableIdentifier && (
                    <span className="absolute bottom-2 left-2 text-[11px] bg-gray-900/80 backdrop-blur-xs text-white px-2 py-0.5 rounded-full font-medium">
                      {photo.tableIdentifier}
                    </span>
                  )}
                </div>

                <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between">
                  <div>
                    {photo.guestName && (
                      <p className="text-xs font-semibold text-marsala-ink truncate">
                        {photo.guestName}
                      </p>
                    )}
                    {photo.message && (
                      <p className="text-[11px] text-gray-600 italic line-clamp-2 mt-0.5">
                        &ldquo;{photo.message}&rdquo;
                      </p>
                    )}

                    {/* Engagement stats */}
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
                      <span className="flex items-center gap-1 font-medium">
                        <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                        {photo.likeCount || 0}
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <MessageSquare className="w-3.5 h-3.5 text-marsala-ink" />
                        {photo.commentCount || 0}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-gray-100">
                    {photo.status !== "approved" && (
                      <button
                        onClick={() => handlePhotoStatus(photo.id, "approved")}
                        className="flex-1 p-1 sm:p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg sm:rounded-xl text-[11px] sm:text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="Aprovar Foto"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Aprovar</span>
                      </button>
                    )}

                    {photo.status !== "hidden" && (
                      <button
                        onClick={() => handlePhotoStatus(photo.id, "hidden")}
                        className="flex-1 p-1 sm:p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg sm:rounded-xl text-[11px] sm:text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="Ocultar Foto"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Ocultar</span>
                      </button>
                    )}

                    <button
                      onClick={() => setPhotoToDelete(photo)}
                      className="p-1 sm:p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg sm:rounded-xl text-[11px] sm:text-[11px] transition-colors cursor-pointer shrink-0"
                      title="Excluir Foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Host Photo Delete Confirmation Modal */}
      {photoToDelete && (
        <div
          onClick={() => {
            if (!isDeletingPhoto) setPhotoToDelete(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-gray-100 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center"
          >
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Excluir Foto?
            </h3>

            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              Tem certeza que deseja excluir esta foto permanentemente do evento?
            </p>

            <div className="my-3 mx-auto w-24 h-24 rounded-2xl overflow-hidden border border-gray-200 shadow-inner bg-gray-100 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoToDelete.url}
                alt="Prévia"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={isDeletingPhoto}
                onClick={() => setPhotoToDelete(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingPhoto}
                onClick={confirmDeletePhoto}
                className="flex-1 py-2.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isDeletingPhoto ? <span>Excluindo...</span> : <span>Sim, Excluir</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
