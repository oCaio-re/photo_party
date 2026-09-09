"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Download,
  X,
  Heart,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Send,
  Trash2,
  Clock,
  Flame,
  User,
  AlertCircle,
  Camera,
  Video,
  BookOpen,
} from "lucide-react";
import { PhotoQuestsHub } from "@/components/PhotoQuestsHub";
import { EventChatView } from "@/components/EventChatView";

export interface PhotoItem {
  id: string;
  url: string;
  guestName: string | null;
  message: string | null;
  mediaType?: "photo" | "video";
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
}

export interface CommentItem {
  id: string;
  photoId: string;
  guestName: string;
  content: string;
  createdAt: string | number;
  canDelete?: boolean;
}

interface LiveGalleryViewProps {
  slug: string;
  initialPhotos?: PhotoItem[];
}

function formatTimeAgo(dateInput: string | number | Date): string {
  const date = new Date(dateInput);
  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 60) return "agora";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} min`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d`;
}

export function LiveGalleryView({ slug, initialPhotos = [] }: LiveGalleryViewProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>(initialPhotos);
  const [activePhoto, setActivePhoto] = useState<PhotoItem | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>("all");
  const [mainTab, setMainTab] = useState<"gallery" | "quests" | "chat">("gallery");
  const [selectedQuestFilter, setSelectedQuestFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<"recent" | "likes">("recent");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Guest identity
  const [guestSessionId, setGuestSessionId] = useState<string>("");
  const [guestName, setGuestName] = useState<string>("");
  const [myUploadedPhotoIds, setMyUploadedPhotoIds] = useState<Set<string>>(new Set());
  const [showNameModal, setShowNameModal] = useState<boolean>(false);
  const [pendingCommentText, setPendingCommentText] = useState<string>("");
  const [nameInput, setNameInput] = useState<string>("");

  // Photo deletion state
  const [photoToDelete, setPhotoToDelete] = useState<PhotoItem | null>(null);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState<boolean>(false);
  const [deletePhotoError, setDeletePhotoError] = useState<string | null>(null);

  // Double tap heart animation
  const [animatingHeartPhotoId, setAnimatingHeartPhotoId] = useState<string | null>(null);
  const lastTapRef = useRef<{ [key: string]: number }>({});

  // Active photo comments in modal
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState<boolean>(false);
  const [newCommentText, setNewCommentText] = useState<string>("");
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);
  const commentsEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize guest session ID, Name, and owned photos on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      let sId = localStorage.getItem("photo_party_guest_id");
      if (!sId) {
        sId = crypto.randomUUID();
        localStorage.setItem("photo_party_guest_id", sId);
      }
      setGuestSessionId(sId);

      const savedName = localStorage.getItem("photo_party_guest_name") || "";
      setGuestName(savedName);
      setNameInput(savedName);

      try {
        const stored = JSON.parse(localStorage.getItem("photo_party_my_photos") || "[]");
        if (Array.isArray(stored)) {
          setMyUploadedPhotoIds(new Set(stored));
        }
      } catch (e) {
        // ignore
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const activePhotoId = activePhoto?.id;

  // Fetch photos with like & comment aggregates
  const fetchLatestPhotos = useCallback(async () => {
    try {
      const sId = localStorage.getItem("photo_party_guest_id") || "";
      const headers: Record<string, string> = {};
      if (sId) {
        headers["x-guest-session-id"] = sId;
      }

      const response = await fetch(`/api/events/${slug}/photos`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.photos)) {
          setPhotos(data.photos);
          setActivePhoto((prev) => {
            if (!prev) return null;
            const updated = data.photos.find((p: PhotoItem) => p.id === prev.id);
            if (!updated) return null;
            if (
              prev.likeCount === updated.likeCount &&
              prev.commentCount === updated.commentCount &&
              prev.hasLiked === updated.hasLiked &&
              prev.canDelete === updated.canDelete
            ) {
              return prev;
            }
            return { ...prev, ...updated };
          });
        }
      }
    } catch (e) {
      console.warn("Polling error:", e);
    }
  }, [slug]);

  // Periodic polling every 5 seconds
  useEffect(() => {
    fetchLatestPhotos();
    const interval = setInterval(fetchLatestPhotos, 5000);
    return () => {
      clearInterval(interval);
    };
  }, [fetchLatestPhotos]);

  // Fetch comments only when activePhotoId changes
  useEffect(() => {
    if (!activePhotoId) {
      setComments([]);
      setNewCommentText("");
      return;
    }

    let isMounted = true;
    setIsLoadingComments(true);

    const loadComments = async () => {
      try {
        const sId = localStorage.getItem("photo_party_guest_id") || "";
        const headers: Record<string, string> = {};
        if (sId) {
          headers["x-guest-session-id"] = sId;
        }

        const res = await fetch(`/api/events/${slug}/photos/${activePhotoId}/comments`, { headers });
        if (res.ok && isMounted) {
          const data = await res.json();
          setComments(data.comments || []);
        }
      } catch (err) {
        console.warn("Error loading comments:", err);
      } finally {
        if (isMounted) {
          setIsLoadingComments(false);
        }
      }
    };

    loadComments();

    return () => {
      isMounted = false;
    };
  }, [activePhotoId, slug]);

  // Toggle Like (Optimistic UI)
  const handleLikeToggle = useCallback(
    async (photo: PhotoItem, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();

      const sId = guestSessionId || localStorage.getItem("photo_party_guest_id") || "";
      const currentlyLiked = Boolean(photo.hasLiked);
      const updatedLiked = !currentlyLiked;
      const countDelta = updatedLiked ? 1 : -1;
      const newCount = Math.max(0, (photo.likeCount || 0) + countDelta);

      // Optimistic state update in photos list
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photo.id
            ? { ...p, hasLiked: updatedLiked, likeCount: newCount }
            : p
        )
      );

      // Optimistic update in active modal if open
      setActivePhoto((prev) =>
        prev && prev.id === photo.id
          ? { ...prev, hasLiked: updatedLiked, likeCount: newCount }
          : prev
      );

      try {
        const res = await fetch(`/api/events/${slug}/photos/${photo.id}/like`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-guest-session-id": sId,
          },
          body: JSON.stringify({ guestSessionId: sId }),
        });
        if (res.ok) {
          const data = await res.json();
          setPhotos((prev) =>
            prev.map((p) =>
              p.id === photo.id
                ? { ...p, hasLiked: data.liked, likeCount: data.likeCount }
                : p
            )
          );
          setActivePhoto((prev) =>
            prev && prev.id === photo.id
              ? { ...prev, hasLiked: data.liked, likeCount: data.likeCount }
              : prev
          );
        }
      } catch (err) {
        console.error("Failed to toggle like:", err);
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photo.id
              ? { ...p, hasLiked: currentlyLiked, likeCount: photo.likeCount || 0 }
              : p
          )
        );
        setActivePhoto((prev) =>
          prev && prev.id === photo.id
            ? { ...prev, hasLiked: currentlyLiked, likeCount: photo.likeCount || 0 }
            : prev
        );
      }
    },
    [guestSessionId, slug]
  );

  // Double tap handler on photo using event timestamp
  const handlePhotoDoubleTap = useCallback(
    (photo: PhotoItem, e: React.MouseEvent | React.TouchEvent) => {
      const now = e.timeStamp;
      const lastTap = lastTapRef.current[photo.id] || 0;
      const isDoubleTap = now - lastTap < 350;
      lastTapRef.current[photo.id] = now;

      if (isDoubleTap) {
        e.stopPropagation();
        setAnimatingHeartPhotoId(photo.id);
        setTimeout(() => setAnimatingHeartPhotoId(null), 850);
        if (!photo.hasLiked) {
          handleLikeToggle(photo);
        }
      }
    },
    [handleLikeToggle]
  );

  const postComment = useCallback(
    async (photoId: string, content: string, authorName: string) => {
      const sId = guestSessionId || localStorage.getItem("photo_party_guest_id") || "";

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
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId
            ? { ...p, commentCount: (p.commentCount || 0) + 1 }
            : p
        )
      );
      setActivePhoto((prev) =>
        prev && prev.id === photoId
          ? { ...prev, commentCount: (prev.commentCount || 0) + 1 }
          : prev
      );

      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);

      try {
        const res = await fetch(`/api/events/${slug}/photos/${photoId}/comments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-guest-session-id": sId,
          },
          body: JSON.stringify({
            guestSessionId: sId,
            guestName: authorName,
            content,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setComments((prev) =>
            prev.map((c) => (c.id === tempId ? data.comment : c))
          );
          setPhotos((prev) =>
            prev.map((p) =>
              p.id === photoId
                ? { ...p, commentCount: data.commentCount }
                : p
            )
          );
          setActivePhoto((prev) =>
            prev && prev.id === photoId
              ? { ...prev, commentCount: data.commentCount }
              : prev
          );
        } else {
          setComments((prev) => prev.filter((c) => c.id !== tempId));
          setNewCommentText(content);
        }
      } catch (err) {
        console.error("Failed to post comment:", err);
        setComments((prev) => prev.filter((c) => c.id !== tempId));
        setNewCommentText(content);
      } finally {
        setIsSubmittingComment(false);
      }
    },
    [guestSessionId, slug]
  );

  // Submit comment handler
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePhoto) return;

    const trimmedContent = newCommentText.trim();
    if (!trimmedContent) return;

    const currentName = guestName.trim() || localStorage.getItem("photo_party_guest_name") || "";
    if (!currentName) {
      setPendingCommentText(trimmedContent);
      setShowNameModal(true);
      return;
    }

    await postComment(activePhoto.id, trimmedContent, currentName);
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!activePhoto) return;
    const sId = guestSessionId || localStorage.getItem("photo_party_guest_id") || "";

    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === activePhoto.id
          ? { ...p, commentCount: Math.max(0, (p.commentCount || 1) - 1) }
          : p
      )
    );

    try {
      await fetch(
        `/api/events/${slug}/photos/${activePhoto.id}/comments/${commentId}?guestSessionId=${sId}`,
        {
          method: "DELETE",
          headers: {
            "x-guest-session-id": sId,
          },
        }
      );
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  // Check if current guest is permitted to delete this photo
  const canDeletePhoto = useCallback(
    (photo: PhotoItem): boolean => {
      return Boolean(photo.canDelete || myUploadedPhotoIds.has(photo.id));
    },
    [myUploadedPhotoIds]
  );

  // Confirm and execute photo deletion
  const handleConfirmDeletePhoto = async () => {
    if (!photoToDelete) return;

    try {
      setIsDeletingPhoto(true);
      setDeletePhotoError(null);

      const sId = guestSessionId || localStorage.getItem("photo_party_guest_id") || "";
      const headers: Record<string, string> = {};
      if (sId) {
        headers["x-guest-session-id"] = sId;
      }

      const res = await fetch(
        `/api/events/${slug}/photos/${photoToDelete.id}?guestSessionId=${encodeURIComponent(sId)}`,
        {
          method: "DELETE",
          headers,
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Não foi possível apagar a foto.");
      }

      // Optimistically remove from state
      setPhotos((prev) => prev.filter((p) => p.id !== photoToDelete.id));

      // Remove from myUploadedPhotoIds
      setMyUploadedPhotoIds((prev) => {
        const next = new Set(prev);
        next.delete(photoToDelete.id);
        return next;
      });

      // Update localStorage
      try {
        const stored = JSON.parse(localStorage.getItem("photo_party_my_photos") || "[]");
        if (Array.isArray(stored)) {
          localStorage.setItem(
            "photo_party_my_photos",
            JSON.stringify(stored.filter((id: string) => id !== photoToDelete.id))
          );
        }
      } catch (e) {
        // ignore
      }

      // If active photo in lightbox is the one deleted, close lightbox
      if (activePhoto?.id === photoToDelete.id) {
        setActivePhoto(null);
      }

      setPhotoToDelete(null);
    } catch (err: unknown) {
      setDeletePhotoError(err instanceof Error ? err.message : "Erro ao apagar a foto.");
    } finally {
      setIsDeletingPhoto(false);
    }
  };

  // Save guest name from modal
  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nameInput.trim();
    if (!clean) return;

    localStorage.setItem("photo_party_guest_name", clean);
    setGuestName(clean);
    setShowNameModal(false);

    if (pendingCommentText && activePhoto) {
      postComment(activePhoto.id, pendingCommentText, clean);
      setPendingCommentText("");
    }
  };

  // Download photo
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
    } catch {
      window.open(photo.url, "_blank");
    }
  };

  // Table options
  const tableOptions = Array.from(
    new Set(
      photos
        .map((p) => p.tableIdentifier)
        .filter((name): name is string => Boolean(name))
    )
  ).sort();

  // Filter & Sort
  const filteredPhotos = photos.filter((p) => {
    if (selectedTable !== "all" && p.tableIdentifier !== selectedTable) return false;
    if (selectedQuestFilter !== "all" && p.questTitle !== selectedQuestFilter) return false;
    return true;
  });

  const sortedPhotos = [...filteredPhotos].sort((a, b) => {
    if (sortMode === "likes") {
      const diffLikes = (b.likeCount || 0) - (a.likeCount || 0);
      if (diffLikes !== 0) return diffLikes;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="w-full">
      {/* Main Mode Tabs: Mural de Fotos vs Desafios vs Recados */}
      <div className="flex items-center justify-center mb-6">
        <div className="inline-flex p-1 bg-[#fffaf5] border border-[#cb7d87]/25 rounded-2xl shadow-xs">
          <button
            onClick={() => setMainTab("gallery")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              mainTab === "gallery"
                ? "bg-[#5a6248] text-[#fbead6] shadow-xs"
                : "text-[#5a6248] hover:text-[#cb7d87] hover:bg-[#fbead6]/50"
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Mural ({photos.length})</span>
          </button>
          <button
            onClick={() => setMainTab("quests")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              mainTab === "quests"
                ? "bg-[#cb7d87] text-white shadow-xs"
                : "text-[#5a6248] hover:text-[#cb7d87] hover:bg-[#fbead6]/50"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>🎯 Desafios</span>
          </button>
          <button
            onClick={() => setMainTab("chat")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              mainTab === "chat"
                ? "bg-[#cb7d87] text-white shadow-xs"
                : "text-[#5a6248] hover:text-[#cb7d87] hover:bg-[#fbead6]/50"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>💬 Recados</span>
          </button>
        </div>
      </div>

      {mainTab === "quests" ? (
        <PhotoQuestsHub
          slug={slug}
          onFilterByQuest={(questTitle) => {
            setSelectedQuestFilter(questTitle);
            setMainTab("gallery");
          }}
        />
      ) : mainTab === "chat" ? (
        <EventChatView
          slug={slug}
          guestSessionId={guestSessionId}
          guestName={guestName}
          onChangeName={() => {
            setNameInput(guestName);
            setShowNameModal(true);
          }}
        />
      ) : (
        <>
          {/* Active Quest Filter Banner */}
          {selectedQuestFilter !== "all" && (
            <div className="flex items-center justify-between bg-[#cb7d87]/15 border border-[#cb7d87]/30 px-4 py-2 rounded-2xl mb-4 text-xs">
              <span className="text-[#5a6248] font-medium flex items-center gap-1.5">
                <span>🎯 Filtrando por desafio:</span>
                <strong className="text-[#cb7d87] font-semibold">{selectedQuestFilter}</strong>
              </span>
              <button
                onClick={() => setSelectedQuestFilter("all")}
                className="text-[#cb7d87] hover:underline font-medium text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Limpar filtro
              </button>
            </div>
          )}

          {/* Top Bar: Sort Mode Toggle & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        {/* Sort Mode Buttons */}
        <div className="inline-flex p-1 bg-[#fffaf5] border border-[#cb7d87]/25 rounded-2xl shadow-xs self-start">
          <button
            onClick={() => setSortMode("recent")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              sortMode === "recent"
                ? "bg-[#cb7d87] text-white shadow-xs"
                : "text-[#5a6248] hover:text-[#cb7d87] hover:bg-[#fbead6]/50"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Mais Recentes</span>
          </button>
          <button
            onClick={() => setSortMode("likes")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              sortMode === "likes"
                ? "bg-[#cb7d87] text-white shadow-xs"
                : "text-[#5a6248] hover:text-[#cb7d87] hover:bg-[#fbead6]/50"
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            <span>Mais Curtidas</span>
          </button>
        </div>

        {/* User name indicator / switcher */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => {
              setNameInput(guestName);
              setShowNameModal(true);
            }}
            className="flex items-center gap-1.5 text-xs text-[#5a6248] hover:text-[#cb7d87] bg-[#fffaf5] border border-[#cb7d87]/20 px-3 py-1.5 rounded-full transition-colors"
            title="Alterar seu nome"
          >
            <User className="w-3.5 h-3.5 text-[#cb7d87]" />
            <span className="truncate max-w-[120px]">
              {guestName ? guestName : "Convidado Anônimo"}
            </span>
          </button>

          <Link
            href={`/e/${slug}/guestbook`}
            className="flex items-center gap-1.5 text-xs text-[#5a6248] hover:text-[#cb7d87] bg-[#fffaf5] border border-[#cb7d87]/20 px-3 py-1.5 rounded-full transition-colors cursor-pointer shadow-2xs"
            title="Abrir Livro Digital de Recordações"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#cb7d87]" />
            <span className="hidden sm:inline">Livro de Recordações</span>
          </Link>

          <button
            onClick={async () => {
              setIsRefreshing(true);
              await fetchLatestPhotos();
              setTimeout(() => setIsRefreshing(false), 400);
            }}
            className="p-1.5 text-[#5a6248] hover:text-[#cb7d87] rounded-full transition-transform active:rotate-180 cursor-pointer"
            title="Atualizar galeria"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Table Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 border-b border-[#cb7d87]/20 scrollbar-none">
        <button
          onClick={() => setSelectedTable("all")}
          className={`text-xs px-4 py-1.5 rounded-full transition-all font-medium whitespace-nowrap ${
            selectedTable === "all"
              ? "bg-[#5a6248] text-[#fbead6] shadow-sm"
              : "bg-[#fffaf5] text-[#5a6248] hover:bg-[#fbead6] border border-[#cb7d87]/20"
          }`}
        >
          Todas as Fotos ({photos.length})
        </button>
        {tableOptions.map((tName) => (
          <button
            key={tName}
            onClick={() => setSelectedTable(tName)}
            className={`text-xs px-3 py-1.5 rounded-full transition-all font-medium whitespace-nowrap ${
              selectedTable === tName
                ? "bg-[#5a6248] text-[#fbead6] shadow-sm"
                : "bg-[#fffaf5] text-[#5a6248] hover:bg-[#fbead6] border border-[#5a6248]/20"
            }`}
          >
            {tName}
          </button>
        ))}
      </div>

      {/* Photos Grid */}
      {sortedPhotos.length === 0 ? (
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
          {sortedPhotos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => setActivePhoto(photo)}
              onDoubleClick={(e) => handlePhotoDoubleTap(photo, e)}
              onTouchEnd={(e) => handlePhotoDoubleTap(photo, e)}
              className="break-inside-avoid group cursor-pointer bg-[#fffaf5] border border-[#cb7d87]/25 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative"
            >
              {/* Media Container (Photo or Video) */}
              <div className="relative overflow-hidden bg-[#fbead6]/40 select-none">
                {photo.mediaType === "video" ? (
                  <div className="relative w-full">
                    <video
                      src={photo.url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                    />
                    <span className="absolute top-2 right-2 z-10 text-[10px] font-semibold bg-black/60 text-white px-2 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1 group-hover:opacity-0 transition-opacity">
                      <Video className="w-3 h-3 text-[#ebca90]" />
                      <span>Vídeo</span>
                    </span>
                  </div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={photo.url}
                    alt={photo.guestName ? `Foto de ${photo.guestName}` : "Foto do evento"}
                    loading="lazy"
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}

                {/* Double Tap Floating Heart Animation */}
                {animatingHeartPhotoId === photo.id && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div className="animate-ping duration-700">
                      <Heart className="w-16 h-16 text-rose-500 fill-rose-500 drop-shadow-xl" />
                    </div>
                  </div>
                )}

                {/* Table badge pill */}
                {photo.tableIdentifier && (
                  <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wider font-semibold bg-[#5a6248]/85 text-[#fbead6] px-2 py-0.5 rounded-full backdrop-blur-xs shadow-xs">
                    {photo.tableIdentifier}
                  </span>
                )}

                {/* Quest badge pill */}
                {photo.questTitle && (
                  <span className="absolute bottom-2 left-2 max-w-[85%] truncate text-[10px] font-medium bg-[#cb7d87]/90 text-white px-2 py-0.5 rounded-full backdrop-blur-xs shadow-xs flex items-center gap-1 z-10">
                    <span>🎯</span>
                    <span className="truncate">{photo.questTitle}</span>
                  </span>
                )}

                {/* Top action buttons */}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {canDeletePhoto(photo) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotoToDelete(photo);
                      }}
                      aria-label="Apagar minha foto"
                      title="Apagar minha foto"
                      className="p-1.5 rounded-full bg-rose-600/90 hover:bg-rose-600 text-white shadow-xs backdrop-blur-xs transition-colors active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDownload(photo, e)}
                    aria-label="Baixar foto"
                    className="p-1.5 rounded-full bg-black/50 text-white hover:bg-[#cb7d87] shadow-xs backdrop-blur-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card Footer: Dedication and Instagram Actions Bar */}
              <div className="p-3 border-t border-[#cb7d87]/15 bg-[#fffaf5]">
                {(photo.guestName || photo.message) && (
                  <div className="mb-2">
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

                {/* Instagram Action Buttons Bar (Like & Comment) */}
                <div className="flex items-center justify-between pt-1 border-t border-[#cb7d87]/10 text-xs">
                  <div className="flex items-center gap-3">
                    {/* Like button */}
                    <button
                      onClick={(e) => handleLikeToggle(photo, e)}
                      className="flex items-center gap-1 text-[#5a6248] hover:text-rose-500 transition-colors active:scale-125"
                      title={photo.hasLiked ? "Descurtir" : "Curtir"}
                    >
                      <Heart
                        className={`w-4 h-4 transition-colors ${
                          photo.hasLiked
                            ? "text-rose-500 fill-rose-500"
                            : "text-[#5a6248] group-hover:text-[#cb7d87]"
                        }`}
                      />
                      <span className="font-semibold text-[11px] text-[#5a6248]">
                        {photo.likeCount || 0}
                      </span>
                    </button>

                    {/* Comment button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePhoto(photo);
                      }}
                      className="flex items-center gap-1 text-[#5a6248] hover:text-[#cb7d87] transition-colors"
                      title="Comentários"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[#5a6248]" />
                      <span className="font-semibold text-[11px] text-[#5a6248]">
                        {photo.commentCount || 0}
                      </span>
                    </button>
                  </div>

                  <span className="text-[10px] text-[#7c8764]">
                    {formatTimeAgo(photo.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )}

      {/* Instagram-Style Lightbox Modal */}
      {activePhoto && (
        <div
          onClick={() => setActivePhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full bg-[#fffaf5] rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[92vh]"
          >
            {/* Left Side: Photo/Video Display */}
            <div
              onDoubleClick={(e) => handlePhotoDoubleTap(activePhoto, e)}
              className="flex-1 bg-black flex items-center justify-center relative min-h-[260px] sm:min-h-[380px] overflow-hidden select-none"
            >
              {activePhoto.mediaType === "video" ? (
                <video
                  src={activePhoto.url}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[50vh] md:max-h-[85vh] w-auto max-w-full object-contain"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={activePhoto.url}
                  alt={activePhoto.guestName || "Foto"}
                  className="max-h-[50vh] md:max-h-[85vh] w-auto object-contain"
                />
              )}

              {/* Heart Pop on double tap inside modal */}
              {animatingHeartPhotoId === activePhoto.id && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <div className="animate-ping duration-700">
                    <Heart className="w-20 h-20 text-rose-500 fill-rose-500 drop-shadow-2xl" />
                  </div>
                </div>
              )}
            </div>

            {/* Right Side: Instagram-like Header, Comments Feed, and Sticky Input */}
            <div className="w-full md:w-[380px] lg:w-[420px] flex flex-col bg-[#fffaf5] border-t md:border-t-0 md:border-l border-[#cb7d87]/20 max-h-[45vh] md:max-h-[85vh]">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#cb7d87]/15 bg-[#fffaf5]">
                <div className="flex items-center gap-2 flex-wrap">
                  {activePhoto.tableIdentifier && (
                    <span className="text-[11px] font-semibold bg-[#5a6248] text-[#fbead6] px-2.5 py-0.5 rounded-full">
                      {activePhoto.tableIdentifier}
                    </span>
                  )}
                  {activePhoto.questTitle && (
                    <span className="text-[11px] font-medium bg-[#cb7d87] text-white px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <span>🎯</span>
                      <span className="truncate max-w-[130px]">{activePhoto.questTitle}</span>
                    </span>
                  )}
                  {activePhoto.guestName && (
                    <span className="text-xs font-serif font-medium text-[#cb7d87] truncate max-w-[140px]">
                      Por {activePhoto.guestName}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {canDeletePhoto(activePhoto) && (
                    <button
                      onClick={() => setPhotoToDelete(activePhoto)}
                      className="p-1.5 text-rose-600 hover:text-rose-700 rounded-full hover:bg-rose-100/60 transition-colors flex items-center gap-1 text-xs font-medium"
                      title="Apagar minha foto"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Apagar</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleDownload(activePhoto)}
                    className="p-1.5 text-[#5a6248] hover:text-[#cb7d87] rounded-full hover:bg-[#fbead6]/50 transition-colors"
                    title="Baixar foto"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActivePhoto(null)}
                    className="p-1.5 text-[#5a6248] hover:text-[#cb7d87] rounded-full hover:bg-[#fbead6]/50 transition-colors"
                    aria-label="Fechar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Comments and Dedication Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-[#cb7d87]/10 text-xs">
                {/* Original Photo Dedication (if present) */}
                {activePhoto.message && (
                  <div className="pb-3 bg-[#fbead6]/30 p-3 rounded-2xl border border-[#cb7d87]/15">
                    <p className="text-[11px] font-semibold text-[#cb7d87] mb-0.5">
                      {activePhoto.guestName || "Autor da Foto"}
                    </p>
                    <p className="font-serif text-sm text-[#5a6248] italic leading-relaxed">
                      &ldquo;{activePhoto.message}&rdquo;
                    </p>
                  </div>
                )}

                {/* Comments List */}
                {isLoadingComments ? (
                  <div className="py-8 text-center text-[#7c8764]">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-[#cb7d87]" />
                    <span>Carregando comentários...</span>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="py-8 text-center text-[#7c8764]">
                    <MessageSquare className="w-5 h-5 mx-auto mb-1 text-[#cb7d87]/60" />
                    <p className="font-medium text-xs text-[#5a6248]">Nenhum comentário ainda</p>
                    <p className="text-[11px] mt-0.5">Seja o primeiro a deixar uma mensagem!</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="pt-3 group flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#5a6248]">
                            {comment.guestName}
                          </span>
                          <span className="text-[10px] text-[#7c8764]">
                            {formatTimeAgo(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-[#353b2a] mt-0.5 leading-relaxed break-words whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>

                      {/* Delete comment button (if author or host) */}
                      {comment.canDelete && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-[#7c8764] hover:text-rose-600 p-1 opacity-60 group-hover:opacity-100 transition-opacity"
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

              {/* Action Bar: Heart, Like Count, Time */}
              <div className="px-4 py-2.5 border-t border-[#cb7d87]/15 bg-[#fffaf5]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLikeToggle(activePhoto)}
                      className="flex items-center gap-1.5 p-1 -ml-1 text-[#5a6248] hover:text-rose-500 transition-colors active:scale-125"
                    >
                      <Heart
                        className={`w-5 h-5 ${
                          activePhoto.hasLiked
                            ? "text-rose-500 fill-rose-500"
                            : "text-[#5a6248]"
                        }`}
                      />
                      <span className="font-semibold text-xs text-[#5a6248]">
                        {activePhoto.likeCount || 0} {activePhoto.likeCount === 1 ? "curtida" : "curtidas"}
                      </span>
                    </button>
                  </div>

                  <span className="text-[11px] text-[#7c8764]">
                    {formatTimeAgo(activePhoto.createdAt)}
                  </span>
                </div>
              </div>

              {/* Sticky Input Bar */}
              <form
                onSubmit={handleCommentSubmit}
                className="p-3 border-t border-[#cb7d87]/15 bg-[#fffaf5] flex items-center gap-2"
              >
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder={
                    guestName
                      ? `Comentar como ${guestName}...`
                      : "Adicione um comentário..."
                  }
                  maxLength={500}
                  className="flex-1 px-3.5 py-2 text-xs bg-white border border-[#cb7d87]/25 rounded-full text-[#353b2a] placeholder-[#7c8764]/70 focus:outline-none focus:ring-1 focus:ring-[#cb7d87]"
                />
                <button
                  type="submit"
                  disabled={!newCommentText.trim() || isSubmittingComment}
                  className="p-2 bg-[#cb7d87] hover:bg-[#b86a76] disabled:opacity-40 text-white rounded-full transition-all active:scale-95 shadow-xs"
                  aria-label="Publicar comentário"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Guest Name Modal (Framework-native dialog) */}
      {showNameModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#fffaf5] border border-[#cb7d87]/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-[#cb7d87]/15 flex items-center justify-center text-[#cb7d87] mx-auto mb-3">
              <User className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl text-center text-[#5a6248] mb-1">
              Como quer ser chamado?
            </h3>
            <p className="text-xs text-center text-[#7c8764] mb-4">
              Seu nome aparecerá nos comentários e fotos que você compartilhar nesta festa.
            </p>

            <form onSubmit={handleSaveName} className="space-y-3">
              <input
                type="text"
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Seu nome (ex: Ana, Tio Carlos)"
                maxLength={60}
                className="w-full px-4 py-2.5 text-xs bg-white border border-[#cb7d87]/30 rounded-xl text-[#353b2a] focus:outline-none focus:ring-2 focus:ring-[#cb7d87]"
              />
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowNameModal(false);
                    if (pendingCommentText && activePhoto) {
                      postComment(activePhoto.id, pendingCommentText, "Convidado Anônimo");
                      setPendingCommentText("");
                    }
                  }}
                  className="flex-1 py-2 text-xs font-medium text-[#7c8764] hover:bg-[#fbead6]/50 rounded-xl transition-colors"
                >
                  Continuar Anônimo
                </button>
                <button
                  type="submit"
                  disabled={!nameInput.trim()}
                  className="flex-1 py-2 text-xs font-medium bg-[#cb7d87] hover:bg-[#b86a76] disabled:opacity-40 text-white rounded-xl transition-all shadow-xs"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Delete Confirmation Modal (Framework-native, no window.confirm) */}
      {photoToDelete && (
        <div
          onClick={() => {
            if (!isDeletingPhoto) {
              setPhotoToDelete(null);
              setDeletePhotoError(null);
            }
          }}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#fffaf5] border border-[#cb7d87]/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center"
          >
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="font-serif text-xl text-[#5a6248] font-medium mb-1">
              Apagar Foto?
            </h3>

            <p className="text-xs text-[#7c8764] leading-relaxed mb-3">
              Tem certeza que deseja apagar esta foto? Ela será excluída permanentemente da galeria e do telão do evento.
            </p>

            {/* Thumbnail preview */}
            <div className="my-3 mx-auto w-24 h-24 rounded-2xl overflow-hidden border border-[#cb7d87]/20 shadow-inner bg-[#fbead6]/40 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoToDelete.url}
                alt="Prévia"
                className="w-full h-full object-cover"
              />
            </div>

            {deletePhotoError && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs text-left flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{deletePhotoError}</span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={isDeletingPhoto}
                onClick={() => {
                  setPhotoToDelete(null);
                  setDeletePhotoError(null);
                }}
                className="flex-1 py-2 text-xs font-medium text-[#7c8764] hover:bg-[#fbead6]/50 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingPhoto}
                onClick={handleConfirmDeletePhoto}
                className="flex-1 py-2 text-xs font-medium bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
              >
                {isDeletingPhoto ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Apagando...</span>
                  </>
                ) : (
                  <span>Sim, Apagar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
