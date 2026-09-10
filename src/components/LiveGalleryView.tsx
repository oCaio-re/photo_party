"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Download,
  X,
  Heart,
  MessageSquare,
  Sparkles,
  Send,
  Trash2,
  Video,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Camera,
} from "lucide-react";
import { EventHeroHeader } from "@/components/EventHeroHeader";
import { PhotoQuestsHub } from "@/components/PhotoQuestsHub";
import { EventChatView } from "@/components/EventChatView";
import {
  WeddingMomentConfig,
  DEFAULT_WEDDING_MOMENTS,
  getCurrentActiveMomentId,
} from "@/lib/moments";

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
  title?: string;
  tableName?: string;
  initialPhotos?: PhotoItem[];
  momentsConfig?: WeddingMomentConfig[];
}

// Curated stock photos as default until real photos are uploaded (requested by user)
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
    likeCount: 18,
    commentCount: 4,
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
    likeCount: 34,
    commentCount: 7,
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
    likeCount: 22,
    commentCount: 3,
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
    likeCount: 45,
    commentCount: 9,
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
    likeCount: 29,
    commentCount: 5,
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
    likeCount: 52,
    commentCount: 11,
  },
];

function formatPhotoTime(dateInput: string | number | Date): string {
  const date = new Date(dateInput);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

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

export function LiveGalleryView({
  slug,
  title = "Caio & Sarah ✨💍",
  tableName,
  initialPhotos = [],
  momentsConfig = DEFAULT_WEDDING_MOMENTS,
}: LiveGalleryViewProps) {
  const moments = momentsConfig && momentsConfig.length > 0 ? momentsConfig : DEFAULT_WEDDING_MOMENTS;
  const [photos, setPhotos] = useState<PhotoItem[]>(initialPhotos);
  const [activePhoto, setActivePhoto] = useState<PhotoItem | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>("all");
  const [mainTab, setMainTab] = useState<"hub" | "gallery" | "quests" | "chat">("hub");
  const [selectedQuestFilter, setSelectedQuestFilter] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortMode, setSortMode] = useState<"recent" | "likes">("recent");

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
  const ignoreNextClickRef = useRef<string | null>(null);

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
        ignoreNextClickRef.current = photo.id;
        setTimeout(() => {
          if (ignoreNextClickRef.current === photo.id) {
            ignoreNextClickRef.current = null;
          }
        }, 400);
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

  const canDeletePhoto = useCallback(
    (photo: PhotoItem): boolean => {
      return Boolean(photo.canDelete || myUploadedPhotoIds.has(photo.id));
    },
    [myUploadedPhotoIds]
  );

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

      setPhotos((prev) => prev.filter((p) => p.id !== photoToDelete.id));

      setMyUploadedPhotoIds((prev) => {
        const next = new Set(prev);
        next.delete(photoToDelete.id);
        return next;
      });

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

  // Combine real photos with default stock photos if no user photos yet
  const combinedPhotos = photos.length > 0 ? photos : DEFAULT_STOCK_PHOTOS;

  // Table options
  const tableOptions = Array.from(
    new Set(
      combinedPhotos
        .map((p) => p.tableIdentifier)
        .filter((name): name is string => Boolean(name))
    )
  ).sort();

  // Filter & Sort
  const filteredPhotos = combinedPhotos.filter((p) => {
    if (selectedTable !== "all" && p.tableIdentifier !== selectedTable) return false;
    if (selectedQuestFilter !== "all" && p.questTitle !== selectedQuestFilter) return false;

    // Filter by moment if a wedding moment is selected
    if (moments.some((m) => m.id === selectedCategory)) {
      if (p.moment !== selectedCategory) return false;
    }

    // Filter by category from exemplo_grid.png tabs & carousel
    if (selectedCategory === "videos" && p.mediaType !== "video") return false;
    if (selectedCategory === "quests" && !p.questTitle) return false;

    return true;
  });

  const sortedPhotos = [...filteredPhotos].sort((a, b) => {
    if (selectedCategory === "likes" || sortMode === "likes") {
      const diffLikes = (b.likeCount || 0) - (a.likeCount || 0);
      if (diffLikes !== 0) return diffLikes;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const activePhotoIndex = activePhoto ? sortedPhotos.findIndex((p) => p.id === activePhoto.id) : -1;
  const prevPhoto = activePhotoIndex > 0 ? sortedPhotos[activePhotoIndex - 1] : null;
  const nextPhoto =
    activePhotoIndex >= 0 && activePhotoIndex < sortedPhotos.length - 1
      ? sortedPhotos[activePhotoIndex + 1]
      : null;

  // Keyboard navigation for active photo modal
  useEffect(() => {
    if (!activePhoto) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";

      if (e.key === "Escape") {
        setActivePhoto(null);
      } else if (!isInput && e.key === "ArrowLeft") {
        const idx = sortedPhotos.findIndex((p) => p.id === activePhoto.id);
        if (idx > 0) {
          setActivePhoto(sortedPhotos[idx - 1]);
        }
      } else if (!isInput && e.key === "ArrowRight") {
        const idx = sortedPhotos.findIndex((p) => p.id === activePhoto.id);
        if (idx >= 0 && idx < sortedPhotos.length - 1) {
          setActivePhoto(sortedPhotos[idx + 1]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePhoto, sortedPhotos]);

  const selectedMomentObj = moments.find((m) => m.id === selectedCategory);

  return (
    <div className="w-full min-h-screen bg-white text-gray-900 flex flex-col items-center">
      {/* 1. HUB VIEW: Identical to exemplo_nova_UI.jpeg */}
      {mainTab === "hub" && (
        <div className="w-full max-w-md sm:max-w-3xl md:max-w-4xl lg:max-w-5xl mx-auto pb-24">
          <EventHeroHeader
            slug={slug}
            title={title}
            photos={photos}
            tableName={tableName}
            activeTab={mainTab}
            onTabChange={(tab) => setMainTab(tab)}
            onSelectCategory={(cat) => {
              setSelectedCategory(cat);
              if (cat === "recent") setSortMode("recent");
              if (cat === "likes") setSortMode("likes");
            }}
            momentsConfig={moments}
          />
        </div>
      )}

      {/* 2. GALLERY VIEW: Identical to exemplo_grid.png */}
      {mainTab === "gallery" && (
        <div className="w-full max-w-md sm:max-w-3xl md:max-w-5xl lg:max-w-6xl mx-auto pb-28 px-0 sm:px-4">
          {/* Top Bar matching exemplo_grid.png: < 🦋 Caio & Sarah ↓ + */}
          <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 py-3 sm:py-4 px-4 sm:px-2 flex items-center justify-between">
            <button
              onClick={() => setMainTab("hub")}
              className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100 text-gray-900 transition-colors cursor-pointer"
              title="Voltar ao início"
              aria-label="Voltar ao início"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-1.5 text-gray-900">
              <span className="text-base sm:text-lg">🦋</span>
              <span className="font-bold text-base sm:text-lg tracking-tight">
                {title}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`/api/events/${slug}/bundle`}
                download
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-800 transition-colors cursor-pointer"
                title="Baixar todas as fotos"
                aria-label="Baixar todas as fotos"
              >
                <Download className="w-5 h-5 sm:w-6 sm:h-6" />
              </a>
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

          {/* Horizontal Category Tabs with Active Bottom Underline (from exemplo_grid.png) */}
          <div className="flex items-center gap-6 sm:gap-8 px-4 sm:px-2 pt-3 border-b border-gray-100 overflow-x-auto scrollbar-none text-sm sm:text-base bg-white">
            <button
              onClick={() => {
                setSelectedCategory("all");
                setSelectedTable("all");
                setSelectedQuestFilter("all");
              }}
              className={`relative pb-3 whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === "all" && selectedTable === "all" && selectedQuestFilter === "all"
                  ? "text-gray-900 font-bold"
                  : "text-gray-400 hover:text-gray-700 font-medium"
              }`}
            >
              <span>Ver todos</span>
              {selectedCategory === "all" && selectedTable === "all" && selectedQuestFilter === "all" && (
                <span className="absolute bottom-0 inset-x-0 h-[2.5px] bg-gray-900 rounded-full" />
              )}
            </button>

            {/* 6 Wedding Moments Tabs */}
            {moments.map((m) => {
              const isSelected = selectedCategory === m.id;
              const isCurrent = getCurrentActiveMomentId(moments) === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedCategory(m.id);
                    setSelectedTable("all");
                    setSelectedQuestFilter("all");
                  }}
                  className={`relative pb-3 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "text-gray-900 font-bold"
                      : "text-gray-400 hover:text-gray-700 font-medium"
                  }`}
                >
                  <span>{m.icon}</span>
                  <span>{m.name}</span>
                  {isCurrent && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#cb7d87] animate-pulse" />
                  )}
                  {isSelected && (
                    <span className="absolute bottom-0 inset-x-0 h-[2.5px] bg-[#cb7d87] rounded-full" />
                  )}
                </button>
              );
            })}

            <button
              onClick={() => {
                setSelectedCategory("likes");
                setSortMode("likes");
              }}
              className={`relative pb-3 whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === "likes"
                  ? "text-gray-900 font-bold"
                  : "text-gray-400 hover:text-gray-700 font-medium"
              }`}
            >
              <span>Mais Curtidas</span>
              {selectedCategory === "likes" && (
                <span className="absolute bottom-0 inset-x-0 h-[2.5px] bg-gray-900 rounded-full" />
              )}
            </button>

            <button
              onClick={() => setSelectedCategory("videos")}
              className={`relative pb-3 whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === "videos"
                  ? "text-gray-900 font-bold"
                  : "text-gray-400 hover:text-gray-700 font-medium"
              }`}
            >
              <span>Vídeos</span>
              {selectedCategory === "videos" && (
                <span className="absolute bottom-0 inset-x-0 h-[2.5px] bg-gray-900 rounded-full" />
              )}
            </button>

            <button
              onClick={() => setSelectedCategory("quests")}
              className={`relative pb-3 whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === "quests"
                  ? "text-gray-900 font-bold"
                  : "text-gray-400 hover:text-gray-700 font-medium"
              }`}
            >
              <span>Desafios</span>
              {selectedCategory === "quests" && (
                <span className="absolute bottom-0 inset-x-0 h-[2.5px] bg-gray-900 rounded-full" />
              )}
            </button>

            {/* Table filter tabs if present */}
            {tableOptions.map((tName) => (
              <button
                key={tName}
                onClick={() => {
                  setSelectedTable(tName);
                  setSelectedCategory("all");
                }}
                className={`relative pb-3 whitespace-nowrap transition-colors cursor-pointer ${
                  selectedTable === tName
                    ? "text-gray-900 font-bold"
                    : "text-gray-400 hover:text-gray-700 font-medium"
                }`}
              >
                <span>{tName}</span>
                {selectedTable === tName && (
                  <span className="absolute bottom-0 inset-x-0 h-[2.5px] bg-gray-900 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Active Quest Filter Banner */}
          {selectedQuestFilter !== "all" && (
            <div className="flex items-center justify-between bg-[#cb7d87]/10 border border-[#cb7d87]/25 px-4 py-2 mx-2 my-2 rounded-2xl text-xs">
              <span className="text-gray-700 font-medium flex items-center gap-1.5">
                <span>🎯 Desafio:</span>
                <strong className="text-[#cb7d87] font-semibold">{selectedQuestFilter}</strong>
              </span>
              <button
                onClick={() => setSelectedQuestFilter("all")}
                className="text-[#cb7d87] hover:underline font-medium text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Limpar
              </button>
            </div>
          )}

          {/* Active Moment Teaser (when a moment tab has 0 photos) */}
          {selectedMomentObj && sortedPhotos.length === 0 && (
            <div className="mx-4 my-10 p-8 rounded-3xl bg-[#fffaf5] border border-[#cb7d87]/25 text-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-rose-50 border border-[#cb7d87]/30 flex items-center justify-center text-3xl mx-auto mb-3 shadow-xs">
                {selectedMomentObj.icon}
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[11px] text-[#cb7d87] font-semibold mb-2 border border-[#cb7d87]/20 shadow-2xs">
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
                className="inline-flex items-center gap-2 bg-[#cb7d87] hover:bg-[#b86a76] active:scale-95 text-white px-6 py-3 rounded-full text-xs font-semibold shadow-md transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Registrar este momento</span>
              </button>
            </div>
          )}

          {/* Empty General Filter State */}
          {!selectedMomentObj && sortedPhotos.length === 0 && (
            <div className="py-20 text-center text-gray-400">
              <Camera className="w-10 h-10 mx-auto mb-2 opacity-40 text-gray-400" />
              <p className="text-sm font-medium">Nenhuma mídia encontrada nesta categoria</p>
            </div>
          )}

          {/* Portrait 3:4 Grid identical to exemplo_grid.png on mobile, and responsive multi-column with rounded corners on desktop */}
          {sortedPhotos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-[2px] sm:gap-3 md:gap-4 bg-white pt-1 sm:pt-4">
              {sortedPhotos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => {
                    if (ignoreNextClickRef.current === photo.id) return;
                    setActivePhoto(photo);
                  }}
                  onDoubleClick={(e) => handlePhotoDoubleTap(photo, e)}
                  onTouchEnd={(e) => handlePhotoDoubleTap(photo, e)}
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
                  {animatingHeartPhotoId === photo.id && (
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
                  {canDeletePhoto(photo) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotoToDelete(photo);
                      }}
                      aria-label="Apagar foto"
                      title="Apagar foto"
                      className="absolute top-1.5 left-1.5 z-25 p-1 rounded-full bg-rose-600 text-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity active:scale-95"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Photos Count Footer */}
          <div className="py-8 text-center select-none">
            <p className="text-xs font-semibold text-gray-700 tracking-wide">
              {sortedPhotos.length} {sortedPhotos.length === 1 ? "Momento Compartilhado" : "Momentos Compartilhados"}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {sortedPhotos.filter((p) => p.mediaType !== "video").length} fotos
              {sortedPhotos.filter((p) => p.mediaType === "video").length > 0 &&
                ` • ${sortedPhotos.filter((p) => p.mediaType === "video").length} vídeos`}
            </p>
          </div>
        </div>
      )}

      {/* 3. QUESTS VIEW */}
      {mainTab === "quests" && (
        <div className="w-full max-w-md sm:max-w-3xl md:max-w-4xl lg:max-w-5xl mx-auto pb-28 px-0 sm:px-4">
          <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 py-3 sm:py-4 px-4 sm:px-2 flex items-center justify-between mb-4 sm:mb-6">
            <button
              onClick={() => setMainTab("hub")}
              className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100 text-gray-900 transition-colors cursor-pointer"
              title="Voltar ao início"
              aria-label="Voltar ao início"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="font-bold text-base sm:text-lg md:text-xl tracking-tight text-gray-900">
              Desafios da Noite
            </span>
            <div className="w-8" />
          </div>

          <div className="px-4 sm:px-0">
            <PhotoQuestsHub
              slug={slug}
              onFilterByQuest={(questTitle) => {
                setSelectedQuestFilter(questTitle);
                setSelectedCategory("quests");
                setMainTab("gallery");
              }}
            />
          </div>
        </div>
      )}

      {/* 4. CHAT VIEW */}
      {mainTab === "chat" && (
        <div className="w-full max-w-md sm:max-w-xl md:max-w-2xl mx-auto pb-28 px-0 sm:px-4">
          <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 py-3 sm:py-4 px-4 sm:px-2 flex items-center justify-between mb-4 sm:mb-6">
            <button
              onClick={() => setMainTab("hub")}
              className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100 text-gray-900 transition-colors cursor-pointer"
              title="Voltar ao início"
              aria-label="Voltar ao início"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="font-bold text-base sm:text-lg md:text-xl tracking-tight text-gray-900">
              Mural de Recados
            </span>
            <div className="w-8" />
          </div>

          <div className="px-4 sm:px-0">
            <EventChatView
              slug={slug}
              guestSessionId={guestSessionId}
              guestName={guestName}
              onChangeName={() => {
                setNameInput(guestName);
                setShowNameModal(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Instagram-Style Lightbox Modal */}
      {activePhoto && (
        <div
          onClick={() => setActivePhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[92vh]"
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

              {/* Prev / Next Photo Navigation Buttons */}
              {prevPhoto && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePhoto(prevPhoto);
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
                    setActivePhoto(nextPhoto);
                  }}
                  className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-25 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-xs transition-all active:scale-90 cursor-pointer shadow-md"
                  aria-label="Próxima foto"
                  title="Próxima foto (→)"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
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

            {/* Right Side: Header, Comments Feed, and Sticky Input */}
            <div className="w-full md:w-[380px] lg:w-[420px] flex flex-col bg-white border-t md:border-t-0 md:border-l border-gray-100 max-h-[45vh] md:max-h-[85vh]">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
                <div className="flex items-center gap-2 flex-wrap">
                  {activePhotoIndex >= 0 && (
                    <span className="text-[11px] text-gray-500 font-medium hidden sm:inline mr-1">
                      {activePhotoIndex + 1} de {sortedPhotos.length}
                    </span>
                  )}
                  {activePhoto.tableIdentifier && (
                    <span className="text-[11px] font-semibold bg-gray-900 text-white px-2.5 py-0.5 rounded-full">
                      {activePhoto.tableIdentifier}
                    </span>
                  )}
                  {activePhoto.questTitle && (
                    <span className="text-[11px] font-medium bg-[#cb7d87] text-white px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <span>🎯</span>
                      <span className="truncate max-w-[130px]">{activePhoto.questTitle}</span>
                    </span>
                  )}
                  {activePhoto.moment && (
                    <span className="text-[11px] font-medium bg-rose-50 text-[#832d3b] px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-[#cb7d87]/30">
                      <span>{moments.find((m) => m.id === activePhoto.moment)?.icon || "✨"}</span>
                      <span className="truncate max-w-[120px]">
                        {moments.find((m) => m.id === activePhoto.moment)?.name || activePhoto.moment}
                      </span>
                    </span>
                  )}
                  {activePhoto.guestName && (
                    <span className="text-xs font-semibold text-[#cb7d87] truncate max-w-[140px]">
                      Por {activePhoto.guestName}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {canDeletePhoto(activePhoto) && (
                    <button
                      onClick={() => setPhotoToDelete(activePhoto)}
                      className="p-1.5 text-rose-600 hover:text-rose-700 rounded-full hover:bg-rose-50 transition-colors flex items-center gap-1 text-xs font-medium"
                      title="Apagar minha foto"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Apagar</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleDownload(activePhoto)}
                    className="p-1.5 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
                    title="Baixar foto"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActivePhoto(null)}
                    className="p-1.5 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Fechar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Comments Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-gray-100 text-xs">
                {activePhoto.message && (
                  <div className="pb-3">
                    <p className="font-semibold text-gray-900 text-xs flex items-center gap-1.5">
                      <span>{activePhoto.guestName || "Convidado"}</span>
                      <span className="text-[10px] text-gray-400 font-normal">
                        {formatPhotoTime(activePhoto.createdAt)}
                      </span>
                    </p>
                    <p className="text-gray-700 mt-1 leading-relaxed text-sm">
                      {activePhoto.message}
                    </p>
                  </div>
                )}

                {isLoadingComments ? (
                  <div className="py-6 text-center text-gray-400 text-xs">
                    Carregando comentários...
                  </div>
                ) : comments.length === 0 && !activePhoto.message ? (
                  <div className="py-6 text-center text-gray-400 text-xs">
                    Nenhum comentário ainda. Seja o primeiro a comentar!
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="pt-2.5 flex items-start justify-between gap-2 group">
                      <div>
                        <span className="font-semibold text-gray-900 text-xs mr-2">
                          {comment.guestName}
                        </span>
                        <span className="text-gray-700 leading-relaxed text-xs">
                          {comment.content}
                        </span>
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

              {/* Action Bar (Like count & button) */}
              <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                <button
                  onClick={() => handleLikeToggle(activePhoto)}
                  className="flex items-center gap-2 text-gray-700 hover:text-[#cb7d87] transition-colors cursor-pointer"
                >
                  <Heart
                    className={`w-5 h-5 ${
                      activePhoto.hasLiked
                        ? "text-rose-500 fill-rose-500"
                        : "text-gray-600 hover:text-rose-500"
                    }`}
                  />
                  <span className="text-xs font-semibold">
                    {activePhoto.likeCount || 0}{" "}
                    {(activePhoto.likeCount || 0) === 1 ? "curtida" : "curtidas"}
                  </span>
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
        </div>
      )}

      {/* Delete Photo Confirmation Dialog */}
      {photoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 text-center">
            <h4 className="text-lg font-bold text-gray-900">Apagar Foto?</h4>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Esta ação removerá a foto permanentemente da galeria do evento.
            </p>
            {deletePhotoError && (
              <p className="text-xs text-rose-600 mt-2 font-medium">{deletePhotoError}</p>
            )}
            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={() => setPhotoToDelete(null)}
                className="flex-1 py-2.5 rounded-full border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeletePhoto}
                disabled={isDeletingPhoto}
                className="flex-1 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-50"
              >
                {isDeletingPhoto ? "Apagando..." : "Sim, apagar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Guest Name Modal for comments */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <form onSubmit={handleSaveName} className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 text-left">
            <h4 className="text-base font-bold text-gray-900">Como podemos te chamar?</h4>
            <p className="text-xs text-gray-500 mt-1">
              Informe seu nome para que os noivos saibam quem comentou!
            </p>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Ex: Tio Pedro ou Sarah"
              autoFocus
              maxLength={60}
              className="w-full px-4 py-2.5 mt-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#cb7d87] text-sm text-gray-900"
            />
            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowNameModal(false)}
                className="flex-1 py-2.5 rounded-full border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!nameInput.trim()}
                className="flex-1 py-2.5 rounded-full bg-[#cb7d87] hover:bg-[#b86a76] text-white text-xs font-semibold disabled:opacity-50"
              >
                Continuar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
