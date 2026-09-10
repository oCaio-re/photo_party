"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MonogramLogo } from "@/components/MonogramLogo";
import {
  Sparkles,
  Maximize,
  Minimize,
  Heart,
  MessageSquare,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export interface SlideshowComment {
  id: string;
  guestName: string;
  content: string;
  createdAt: string | number | Date;
}

export interface SlideshowPhoto {
  id: string;
  url: string;
  guestName: string | null;
  message: string | null;
  tableIdentifier: string | null;
  mediaType?: "photo" | "video";
  likeCount?: number;
  recentComments?: SlideshowComment[];
}

interface SlideshowClientProps {
  slug: string;
  eventTitle: string;
  initialPhotos: SlideshowPhoto[];
  qrCodeDataUrl: string;
}

// 4 organic positioning slots around the central photo
const BALLOON_SLOT_CLASSES = [
  "top-14 left-4 sm:left-8 lg:left-14 xl:left-20 animate-float-left",
  "top-16 right-4 sm:right-8 lg:right-14 xl:right-20 animate-float-right",
  "top-[50%] left-4 sm:left-8 lg:left-14 xl:left-18 animate-float-right",
  "top-[48%] right-4 sm:right-8 lg:right-14 xl:right-18 animate-float-left",
];

interface SlideshowChatMessage {
  id: string;
  guestName: string;
  tableIdentifier: string | null;
  message: string;
  createdAt: string | number | Date;
}

interface FloatingBubble {
  id: string;
  guestName: string;
  content: string;
  table?: string | null;
  tag?: string;
}

export function SlideshowClient({
  slug,
  eventTitle,
  initialPhotos,
  qrCodeDataUrl,
}: SlideshowClientProps) {
  const [photos, setPhotos] = useState<SlideshowPhoto[]>(initialPhotos);
  const [chatMessages, setChatMessages] = useState<SlideshowChatMessage[]>([]);
  const [activeChatIndex, setActiveChatIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const photosRef = useRef<SlideshowPhoto[]>(photos);
  photosRef.current = photos;

  // Poll for new photos & chat messages without disrupting the slideshow transitions
  useEffect(() => {
    let isSubscribed = true;

    const fetchPhotos = async () => {
      try {
        const res = await fetch(`/api/events/${slug}/photos`);
        if (res.ok && isSubscribed) {
          const data = await res.json();
          if (Array.isArray(data.photos) && data.photos.length > 0) {
            setPhotos((prev) => {
              // Avoid re-rendering if photos signature has not changed
              const prevSig = prev.map((p) => `${p.id}-${p.likeCount}-${p.recentComments?.length || 0}`).join("|");
              const newSig = data.photos.map((p: SlideshowPhoto) => `${p.id}-${p.likeCount}-${p.recentComments?.length || 0}`).join("|");
              return prevSig === newSig ? prev : data.photos;
            });
          }
        }
      } catch (err) {
        console.warn("Slideshow poll error:", err);
      }
    };

    const fetchChat = async () => {
      try {
        const res = await fetch(`/api/events/${slug}/chat`);
        if (res.ok && isSubscribed) {
          const data = await res.json();
          if (Array.isArray(data.messages)) {
            setChatMessages(data.messages);
          }
        }
      } catch (err) {
        console.warn("Slideshow chat poll error:", err);
      }
    };

    fetchPhotos();
    fetchChat();
    const intervalPhotos = setInterval(fetchPhotos, 5000);
    const intervalChat = setInterval(fetchChat, 6000);

    return () => {
      isSubscribed = false;
      clearInterval(intervalPhotos);
      clearInterval(intervalChat);
    };
  }, [slug]);

  // Cycle chat messages ticker in bottom-left every 5 seconds
  useEffect(() => {
    if (chatMessages.length <= 1) return;
    const ticker = setInterval(() => {
      setActiveChatIndex((prev) => (prev + 1) % chatMessages.length);
    }, 5000);
    return () => clearInterval(ticker);
  }, [chatMessages.length]);

  // Slide navigation
  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => {
      const len = photosRef.current.length;
      return len > 0 ? (prev + 1) % len : 0;
    });
    setProgress(0);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => {
      const len = photosRef.current.length;
      return len > 0 ? (prev - 1 + len) % len : 0;
    });
    setProgress(0);
  }, []);

  // Keyboard navigation for operators (Space = pause/play, Arrows = nav)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        nextSlide();
      } else if (e.key === "ArrowLeft") {
        prevSlide();
      } else if (e.key === " ") {
        e.preventDefault();
        setIsPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide]);

  // Periodic slide timer with fluid visual progress bar
  useEffect(() => {
    if (photos.length <= 1 || isPaused) return;

    const current = photosRef.current[currentIndex];
    // Dynamic slide duration: 8s for videos, 7.5s for photos with comments, 6s for standard photos
    const hasComments = Boolean(current?.recentComments && current.recentComments.length > 0);
    const duration = current?.mediaType === "video" ? 8000 : hasComments ? 7500 : 6000;

    const interval = 50;
    const startTime = Date.now();

    const progressTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);

      if (elapsed >= duration) {
        clearInterval(progressTimer);
        nextSlide();
      }
    }, interval);

    return () => clearInterval(progressTimer);
  }, [currentIndex, isPaused, nextSlide, photos.length]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const currentPhoto = photos[currentIndex];

  // Multiple floating comment bubbles around the photo:
  // Combines current photo's comments + wedding guest recados/comments so there are ALWAYS lively comments floating!
  const displayedBubbles: FloatingBubble[] = useMemo(() => {
    if (!currentPhoto) return [];
    const bubbles: FloatingBubble[] = [];
    const seenIds = new Set<string>();

    // 1. Current photo's dedicated comments
    if (currentPhoto.recentComments) {
      for (const c of currentPhoto.recentComments) {
        if (!seenIds.has(c.id)) {
          seenIds.add(c.id);
          bubbles.push({
            id: c.id,
            guestName: c.guestName,
            content: c.content,
            tag: "nesta foto",
          });
        }
      }
    }

    // 2. Supplement from live chat messages across the wedding (rotated by currentIndex)
    if (bubbles.length < 4 && chatMessages.length > 0) {
      const offset = (currentIndex * 2) % chatMessages.length;
      for (let i = 0; i < chatMessages.length && bubbles.length < 4; i++) {
        const msg = chatMessages[(offset + i) % chatMessages.length];
        if (!seenIds.has(msg.id)) {
          seenIds.add(msg.id);
          bubbles.push({
            id: msg.id,
            guestName: msg.guestName,
            content: msg.message,
            table: msg.tableIdentifier,
            tag: "mural",
          });
        }
      }
    }

    // 3. Supplement from other photos' recent comments if still needed
    if (bubbles.length < 4) {
      for (const p of photos) {
        if (p.id !== currentPhoto.id && p.recentComments) {
          for (const c of p.recentComments) {
            if (bubbles.length >= 4) break;
            if (!seenIds.has(c.id)) {
              seenIds.add(c.id);
              bubbles.push({
                id: c.id,
                guestName: c.guestName,
                content: c.content,
                table: p.tableIdentifier,
              });
            }
          }
        }
        if (bubbles.length >= 4) break;
      }
    }

    return bubbles.slice(0, 4);
  }, [currentPhoto, chatMessages, photos, currentIndex]);

  return (
    <div className="fixed inset-0 bg-[#353b2a] text-[#fbead6] flex flex-col justify-between overflow-hidden select-none">
      {/* Top Slide Progress Bar */}
      <div className="absolute top-0 inset-x-0 h-1 bg-black/40 z-30 pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-[#cb7d87] to-[#ebca90] transition-all duration-75 ease-linear"
          style={{ width: isPaused ? "100%" : `${progress}%` }}
        />
      </div>

      {/* Top Overlay Bar */}
      <div className="relative z-20 flex items-center justify-between px-6 sm:px-8 py-5 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center gap-3">
          <MonogramLogo size={42} color="#fbead6" />
          <div>
            <h1 className="font-serif text-2xl tracking-wide font-light text-white">
              {eventTitle}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-[#ebca90] tracking-wider uppercase font-semibold">
                Modo Telão ao Vivo
              </span>
              {photos.length > 0 && (
                <span className="text-[11px] text-white/60">
                  • Foto {currentIndex + 1} de {photos.length}
                </span>
              )}
              {isPaused && (
                <span className="text-[10px] bg-amber-500/80 text-black font-bold uppercase tracking-wider px-2 py-0.5 rounded-full animate-pulse">
                  Pausado
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Pause / Resume Button */}
          <button
            onClick={() => setIsPaused((p) => !p)}
            className="p-2 text-white/80 hover:text-white bg-black/35 hover:bg-black/55 rounded-full backdrop-blur-xs transition-colors cursor-pointer border border-white/15"
            title={isPaused ? "Retomar slides (Espaço)" : "Pausar slides (Espaço)"}
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-white" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 text-white/80 hover:text-white bg-black/35 hover:bg-black/55 rounded-full backdrop-blur-xs transition-colors cursor-pointer border border-white/15"
            title="Alternar Tela Cheia"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Subtle Slide Navigation Arrows (appear on hover) */}
      {photos.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3 rounded-full bg-black/35 hover:bg-black/70 text-white/60 hover:text-white backdrop-blur-md transition-all active:scale-90 cursor-pointer border border-white/10"
            title="Foto anterior (Seta Esquerda)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3 rounded-full bg-black/35 hover:bg-black/70 text-white/60 hover:text-white backdrop-blur-md transition-all active:scale-90 cursor-pointer border border-white/10"
            title="Próxima foto (Seta Direita)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Main Slideshow Center View */}
      <div className="flex-1 relative flex items-center justify-center p-6 overflow-hidden">
        {photos.length === 0 ? (
          <div className="text-center bg-black/40 backdrop-blur-md p-10 rounded-3xl border border-[#cb7d87]/30 max-w-md">
            <Sparkles className="w-12 h-12 text-[#ebca90] mx-auto mb-3" />
            <h2 className="font-serif text-3xl text-white">Aguardando Fotos</h2>
            <p className="text-xs text-[#fbead6]/80 mt-2">
              Aponte a câmera para o QR Code no canto inferior para enviar a primeira foto da festa!
            </p>
          </div>
        ) : (
          <div className="relative max-h-[82vh] max-w-[90vw] flex flex-col items-center justify-center transition-all duration-700">
            {/* Main Photo or Video with soft shadow, frame and like badge */}
            <div className="relative">
              {currentPhoto.mediaType === "video" ? (
                <video
                  key={currentPhoto.id}
                  src={currentPhoto.url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="max-h-[72vh] w-auto object-contain rounded-2xl shadow-2xl border border-white/20 transition-opacity duration-500 animate-fade-in"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={currentPhoto.id}
                  src={currentPhoto.url}
                  alt={currentPhoto.guestName || "Foto do Casamento"}
                  className="max-h-[72vh] w-auto object-contain rounded-2xl shadow-2xl border border-white/20 transition-opacity duration-500 animate-fade-in"
                />
              )}

              {/* Like Badge Overlay */}
              {Boolean(currentPhoto.likeCount && currentPhoto.likeCount > 0) && (
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 flex items-center gap-1.5 text-white shadow-xl animate-fade-in">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                  <span className="text-xs font-semibold tracking-wide">
                    {currentPhoto.likeCount}
                  </span>
                </div>
              )}
            </div>

            {/* Dedication and Table Badge Banner */}
            {(currentPhoto.tableIdentifier || currentPhoto.guestName || currentPhoto.message) && (
              <div className="mt-4 bg-black/65 backdrop-blur-md px-6 py-2.5 rounded-full border border-white/15 flex items-center gap-3 shadow-lg z-20 animate-fade-in">
                {currentPhoto.tableIdentifier && (
                  <span className="bg-[#cb7d87] text-white text-xs font-semibold px-3 py-0.5 rounded-full">
                    {currentPhoto.tableIdentifier}
                  </span>
                )}
                {currentPhoto.guestName && (
                  <span className="font-serif text-base text-white font-medium">
                    {currentPhoto.guestName}
                  </span>
                )}
                {currentPhoto.message && (
                  <span className="text-xs text-[#ebca90] italic">
                    &ldquo;{currentPhoto.message}&rdquo;
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Multiple Floating Comment Bubbles around the Photo */}
        {displayedBubbles.map((bubble, index) => {
          const slotClass = BALLOON_SLOT_CLASSES[index % BALLOON_SLOT_CLASSES.length];
          return (
            <div
              key={`${currentPhoto.id}-${bubble.id}-${index}`}
              className={`absolute z-25 max-w-[210px] sm:max-w-[260px] lg:max-w-[300px] xl:max-w-[320px] bg-white/95 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 shadow-2xl border border-[#cb7d87]/35 text-[#353b2a] transition-all duration-700 animate-fade-in select-none ${slotClass}`}
              style={{
                animationDelay: `${(index + 1) * 140}ms`,
              }}
            >
              <div className="flex items-center justify-between gap-1.5 mb-1">
                <div className="flex items-center gap-1.5 truncate">
                  <MessageSquare className="w-3.5 h-3.5 text-[#cb7d87] shrink-0" />
                  <span className="font-semibold text-xs sm:text-sm text-[#832d3b] truncate">
                    {bubble.guestName}
                  </span>
                </div>
                {bubble.table && (
                  <span className="bg-[#cb7d87]/15 text-[#832d3b] text-[9.5px] font-medium px-2 py-0.2 rounded-full shrink-0">
                    {bubble.table}
                  </span>
                )}
                {bubble.tag && !bubble.table && (
                  <span className="bg-[#5a6248]/15 text-[#5a6248] text-[9.5px] font-medium px-1.5 py-0.2 rounded-full shrink-0">
                    {bubble.tag}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-[13px] text-[#49503b] leading-snug line-clamp-3 italic font-serif">
                &ldquo;{bubble.content}&rdquo;
              </p>
            </div>
          );
        })}
      </div>

      {/* Bottom Left Live Chat Ticker Card */}
      {chatMessages.length > 0 && (
        <div className="absolute bottom-6 left-6 z-20 max-w-sm sm:max-w-md bg-black/75 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 border border-[#cb7d87]/40 shadow-2xl text-white animate-fade-in flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#cb7d87] flex items-center justify-center text-white shrink-0 shadow-xs">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#ebca90]">
                Mural ao Vivo
              </span>
              {chatMessages[activeChatIndex % chatMessages.length]?.tableIdentifier && (
                <span className="bg-[#5a6248]/90 text-[#fbead6] text-[9px] px-2 py-0.2 rounded-full font-medium">
                  {chatMessages[activeChatIndex % chatMessages.length].tableIdentifier}
                </span>
              )}
            </div>
            <p className="text-xs text-white/90 font-medium truncate">
              {chatMessages[activeChatIndex % chatMessages.length]?.guestName}:
            </p>
            <p className="font-serif text-sm text-[#fbead6] italic leading-snug line-clamp-2">
              &ldquo;{chatMessages[activeChatIndex % chatMessages.length]?.message}&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* Corner QR Code Call to Action */}
      <div className="absolute bottom-6 right-6 z-20 flex items-center gap-4 bg-white/95 text-[#49503b] p-3.5 rounded-2xl shadow-2xl border border-[#cb7d87]/40 backdrop-blur-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrCodeDataUrl}
          alt="QR Code do Evento"
          className="w-24 h-24 object-contain rounded-lg"
        />
        <div className="max-w-[130px]">
          <p className="font-serif text-sm font-semibold text-[#832d3b] leading-tight">
            Compartilhe as suas Fotos!
          </p>
          <p className="text-[10px] text-[#5a6248] mt-1 leading-snug">
            Aponte a câmera para aparecer aqui na tela
          </p>
        </div>
      </div>
    </div>
  );
}
