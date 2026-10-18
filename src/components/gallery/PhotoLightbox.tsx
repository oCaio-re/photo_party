"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Heart, Send, Trash2, X } from "lucide-react";
import type { CommentItem, PhotoItem } from "@/components/LiveGalleryView";
import type { WeddingMomentConfig } from "@/lib/moments";
import { GuestNameDialog } from "@/components/gallery/GuestNameDialog";

function formatPhotoTime(dateInput: string | number | Date): string {
  const date = new Date(dateInput);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

interface PhotoLightboxProps {
  slug: string;
  photo: PhotoItem;
  moments: WeddingMomentConfig[];
  index: number;
  total: number;
  prevPhoto: PhotoItem | null;
  nextPhoto: PhotoItem | null;
  isAnimatingHeart: boolean;
  canDelete: boolean;
  guestSessionId: string;
  guestName: string;
  onGuestNameChange: (name: string) => void;
  onNavigate: (photo: PhotoItem) => void;
  onClose: () => void;
  onLike: () => void;
  onDoubleTap: (e: React.MouseEvent) => void;
  onRequestDelete: () => void;
  onDownload: () => void;
  onPhotoPatch: (patch: (photo: PhotoItem) => Partial<PhotoItem>) => void;
}

/**
 * Instagram-style expanded view of a Photo with its comment thread.
 * Render with `key={photo.id}` so the comment state resets per Photo.
 */
export function PhotoLightbox({
  slug,
  photo,
  moments,
  index,
  total,
  prevPhoto,
  nextPhoto,
  isAnimatingHeart,
  canDelete,
  guestSessionId,
  guestName,
  onGuestNameChange,
  onNavigate,
  onClose,
  onLike,
  onDoubleTap,
  onRequestDelete,
  onDownload,
  onPhotoPatch,
}: PhotoLightboxProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [pendingCommentText, setPendingCommentText] = useState<string | null>(null);
  const commentsEndRef = useRef<HTMLDivElement | null>(null);

  const photoId = photo.id;
  const moment = photo.moment ? moments.find((m) => m.id === photo.moment) : undefined;

  useEffect(() => {
    let isMounted = true;
    const headers: Record<string, string> = guestSessionId ? { "x-guest-session-id": guestSessionId } : {};

    fetch(`/api/events/${slug}/photos/${photoId}/comments`, { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data) setComments(data.comments || []);
      })
      .catch((err) => console.warn("Error loading comments:", err))
      .finally(() => {
        if (isMounted) setIsLoadingComments(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug, photoId, guestSessionId]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";

      if (e.key === "Escape") {
        onClose();
      } else if (!isInput && e.key === "ArrowLeft" && prevPhoto) {
        onNavigate(prevPhoto);
      } else if (!isInput && e.key === "ArrowRight" && nextPhoto) {
        onNavigate(nextPhoto);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onNavigate, prevPhoto, nextPhoto]);

  const postComment = useCallback(
    async (content: string, authorName: string) => {
      setIsSubmittingComment(true);
      setNewCommentText("");

      const tempId = `temp-${Date.now()}`;
      const optimisticComment: CommentItem = {
        id: tempId,
        photoId,
        guestName: authorName,
        content,
        createdAt: new Date().toISOString(),
        canDelete: true,
      };

      setComments((prev) => [...prev, optimisticComment]);
      onPhotoPatch((p) => ({ commentCount: (p.commentCount || 0) + 1 }));

      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);

      const rollback = () => {
        setComments((prev) => prev.filter((c) => c.id !== tempId));
        onPhotoPatch((p) => ({ commentCount: Math.max(0, (p.commentCount || 1) - 1) }));
        setNewCommentText(content);
      };

      try {
        const res = await fetch(`/api/events/${slug}/photos/${photoId}/comments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-guest-session-id": guestSessionId,
          },
          body: JSON.stringify({ guestSessionId, guestName: authorName, content }),
        });

        if (res.ok) {
          const data = await res.json();
          setComments((prev) => prev.map((c) => (c.id === tempId ? data.comment : c)));
          onPhotoPatch(() => ({ commentCount: data.commentCount }));
        } else {
          rollback();
        }
      } catch (err) {
        console.error("Failed to post comment:", err);
        rollback();
      } finally {
        setIsSubmittingComment(false);
      }
    },
    [guestSessionId, onPhotoPatch, photoId, slug]
  );

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedContent = newCommentText.trim();
    if (!trimmedContent) return;

    if (!guestName.trim()) {
      setPendingCommentText(trimmedContent);
      return;
    }

    await postComment(trimmedContent, guestName.trim());
  };

  const handleDeleteComment = async (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    onPhotoPatch((p) => ({ commentCount: Math.max(0, (p.commentCount || 1) - 1) }));

    try {
      await fetch(
        `/api/events/${slug}/photos/${photoId}/comments/${commentId}?guestSessionId=${encodeURIComponent(guestSessionId)}`,
        { method: "DELETE", headers: { "x-guest-session-id": guestSessionId } }
      );
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-sm animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[92vh]"
      >
        {/* Left Side: Photo/Video Display */}
        <div
          onDoubleClick={onDoubleTap}
          className="flex-1 bg-black flex items-center justify-center relative min-h-[260px] sm:min-h-[380px] overflow-hidden select-none"
        >
          {photo.mediaType === "video" ? (
            <video
              src={photo.url}
              controls
              autoPlay
              playsInline
              className="max-h-[50vh] md:max-h-[85vh] w-auto max-w-full object-contain"
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={photo.url}
              alt={photo.guestName || "Foto"}
              className="max-h-[50vh] md:max-h-[85vh] w-auto object-contain"
            />
          )}

          {/* Prev / Next Photo Navigation Buttons */}
          {prevPhoto && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(prevPhoto);
              }}
              className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-25 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-xs transition-all active:scale-90 cursor-pointer shadow-md"
              aria-label="Foto anterior"
              title="Foto anterior (←)"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}

          {nextPhoto && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(nextPhoto);
              }}
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-25 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-xs transition-all active:scale-90 cursor-pointer shadow-md"
              aria-label="Próxima foto"
              title="Próxima foto (→)"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}

          {/* Heart Pop on double tap inside modal */}
          {isAnimatingHeart && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="animate-ping duration-700">
                <Heart className="w-20 h-20 text-rose-500 fill-rose-500 drop-shadow-2xl" />
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Header, Comments Feed, and Sticky Input */}
        <div className="w-full md:w-[380px] lg:w-[420px] flex flex-col bg-white border-t md:border-t-0 md:border-l border-gray-100 max-h-[45vh] md:max-h-[85vh]">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-2 flex-wrap">
              {index >= 0 && (
                <span className="text-[11px] text-gray-500 font-medium hidden sm:inline mr-1">
                  {index + 1} de {total}
                </span>
              )}
              {photo.tableIdentifier && (
                <span className="text-[11px] font-semibold bg-gray-900 text-white px-2.5 py-0.5 rounded-full">
                  {photo.tableIdentifier}
                </span>
              )}
              {photo.questTitle && (
                <span className="text-[11px] font-medium bg-[#cb7d87] text-white px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span>🎯</span>
                  <span className="truncate max-w-[130px]">{photo.questTitle}</span>
                </span>
              )}
              {photo.moment && (
                <span className="text-[11px] font-medium bg-rose-50 text-[#832d3b] px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-[#cb7d87]/30">
                  <span>{moment?.icon || "✨"}</span>
                  <span className="truncate max-w-[120px]">{moment?.name || photo.moment}</span>
                </span>
              )}
              {photo.guestName && (
                <span className="text-xs font-semibold text-[#cb7d87] truncate max-w-[140px]">
                  Por {photo.guestName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {canDelete && (
                <button
                  onClick={onRequestDelete}
                  className="p-1.5 text-rose-600 hover:text-rose-700 rounded-full hover:bg-rose-50 transition-colors flex items-center gap-1 text-xs font-medium"
                  title="Apagar minha foto"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Apagar</span>
                </button>
              )}
              <button
                onClick={onDownload}
                className="p-1.5 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
                title="Baixar foto"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Comments Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-gray-100 text-xs">
            {photo.message && (
              <div className="pb-3">
                <p className="font-semibold text-gray-900 text-xs flex items-center gap-1.5">
                  <span>{photo.guestName || "Convidado"}</span>
                  <span className="text-[10px] text-gray-400 font-normal">
                    {formatPhotoTime(photo.createdAt)}
                  </span>
                </p>
                <p className="text-gray-700 mt-1 leading-relaxed text-sm">{photo.message}</p>
              </div>
            )}

            {isLoadingComments ? (
              <div className="py-6 text-center text-gray-400 text-xs">Carregando comentários...</div>
            ) : comments.length === 0 && !photo.message ? (
              <div className="py-6 text-center text-gray-400 text-xs">
                Nenhum comentário ainda. Seja o primeiro a comentar!
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="pt-2.5 flex items-start justify-between gap-2 group">
                  <div>
                    <span className="font-semibold text-gray-900 text-xs mr-2">{comment.guestName}</span>
                    <span className="text-gray-700 leading-relaxed text-xs">{comment.content}</span>
                  </div>
                  {comment.canDelete && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-600 p-1 transition-opacity cursor-pointer shrink-0"
                      title="Apagar comentário"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
            <div ref={commentsEndRef} />
          </div>

          {/* Action Bar (Like count & button + Salvar no Celular) */}
          <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between gap-2 bg-gray-50/70">
            <button
              type="button"
              onClick={onLike}
              className="flex items-center gap-1.5 text-gray-700 hover:text-[#cb7d87] transition-colors cursor-pointer active:scale-95"
            >
              <Heart
                className={`w-5 h-5 ${
                  photo.hasLiked ? "text-rose-500 fill-rose-500" : "text-gray-600 hover:text-rose-500"
                }`}
              />
              <span className="text-xs font-semibold">
                {photo.likeCount || 0} {(photo.likeCount || 0) === 1 ? "curtida" : "curtidas"}
              </span>
            </button>

            <button
              type="button"
              onClick={onDownload}
              className="flex items-center gap-1.5 bg-[#cb7d87]/15 hover:bg-[#cb7d87]/25 text-[#832d3b] px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-2xs"
              title="Salvar foto no seu celular"
            >
              <Download className="w-3.5 h-3.5 text-[#cb7d87]" />
              <span>Salvar no Celular</span>
            </button>
          </div>

          {/* Comment Input */}
          <form onSubmit={handleCommentSubmit} className="p-3 border-t border-gray-100 flex items-center gap-2 bg-white">
            <input
              type="text"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Adicione um comentário..."
              className="flex-1 text-xs px-3.5 py-2.5 bg-gray-100 border border-gray-200 rounded-full focus:outline-none focus:border-[#cb7d87] focus:bg-white text-gray-900"
            />
            <button
              type="submit"
              disabled={!newCommentText.trim() || isSubmittingComment}
              className="p-2 bg-[#cb7d87] hover:bg-[#b86a76] text-white rounded-full disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Ask for the Guest's name before their first comment */}
      {pendingCommentText !== null && (
        <div onClick={(e) => e.stopPropagation()}>
          <GuestNameDialog
            initialName={guestName}
            onCancel={() => setPendingCommentText(null)}
            onSave={(name) => {
              onGuestNameChange(name);
              const text = pendingCommentText;
              setPendingCommentText(null);
              postComment(text, name);
            }}
          />
        </div>
      )}
    </div>
  );
}
