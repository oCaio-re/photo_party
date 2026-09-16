"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Camera,
  Sparkles,
  MessageSquare,
  BookOpen,
  Gift,
  ChevronLeft,
  ChevronRight,
  Tv,
  HelpCircle,
} from "lucide-react";
import { PhotoItem } from "./LiveGalleryView";
import { GuestWelcomeCard } from "./GuestWelcomeCard";
import { openHowItWorksGuide } from "./HowItWorksModal";
import {
  WeddingMomentConfig,
  DEFAULT_WEDDING_MOMENTS,
  getCurrentActiveMomentId,
} from "@/lib/moments";

interface EventHeroHeaderProps {
  slug: string;
  title: string;
  photos: PhotoItem[];
  tableName?: string;
  activeTab: "hub" | "gallery" | "quests" | "chat";
  onTabChange: (tab: "hub" | "gallery" | "quests" | "chat") => void;
  onSelectCategory: (category: string) => void;
  momentsConfig?: WeddingMomentConfig[];
}

// Fallback curated warm wedding photos for carousel cards until user photos are uploaded
const FALLBACK_CAROUSEL_IMAGES = {
  recent: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80", // banquet & dinner
  likes: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80", // romantic couple toast
  videos: "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=800&q=80", // wedding party & sparklers
  quests: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=800&q=80", // rings & bouquet
};

// Target date: 11 de Dezembro de 2026, 15:00h Horário de Brasília (UTC-3)
const WEDDING_START_DATE = new Date("2026-12-11T15:00:00-03:00").getTime();
const WEDDING_END_DATE = new Date("2026-12-12T00:00:00-03:00").getTime();

interface CountdownUnit {
  value: string;
  label: string;
}

export function EventHeroHeader({
  slug,
  title,
  photos,
  tableName,
  activeTab,
  onTabChange,
  onSelectCategory,
  momentsConfig = DEFAULT_WEDDING_MOMENTS,
}: EventHeroHeaderProps) {
  // Real-time intelligent countdown state without years
  const [countdown, setCountdown] = useState<{
    title: string;
    units: CountdownUnit[];
  }>({
    title: "faltam para o grande dia",
    units: [
      { value: "03", label: "Meses" },
      { value: "01", label: "Dias" },
      { value: "05", label: "Horas" },
      { value: "30", label: "Minutos" },
      { value: "00", label: "Segundos" },
    ],
  });

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();

      if (now < WEDDING_START_DATE) {
        // Before wedding: Intelligent dynamic countdown
        const diffMs = WEDDING_START_DATE - now;

        const nowDate = new Date(now);
        const targetDate = new Date(WEDDING_START_DATE);

        // Precise calendar months calculation
        let months =
          (targetDate.getFullYear() - nowDate.getFullYear()) * 12 +
          (targetDate.getMonth() - nowDate.getMonth());

        const anchorDate = new Date(nowDate);
        anchorDate.setMonth(anchorDate.getMonth() + months);
        if (anchorDate.getTime() > targetDate.getTime()) {
          months--;
          anchorDate.setTime(nowDate.getTime());
          anchorDate.setMonth(anchorDate.getMonth() + months);
        }

        const remainingDiffMs = Math.max(0, targetDate.getTime() - anchorDate.getTime());
        const days = Math.floor(remainingDiffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

        const dynamicUnits: CountdownUnit[] = [];

        if (months > 0) {
          // When >= 1 month remains: show Meses, Dias, Horas, Minutos, Segundos
          dynamicUnits.push({ value: String(months).padStart(2, "0"), label: "Meses" });
          dynamicUnits.push({ value: String(days).padStart(2, "0"), label: "Dias" });
          dynamicUnits.push({ value: String(hours).padStart(2, "0"), label: "Horas" });
          dynamicUnits.push({ value: String(minutes).padStart(2, "0"), label: "Min" });
          dynamicUnits.push({ value: String(seconds).padStart(2, "0"), label: "Seg" });
        } else if (days > 0) {
          // Less than 1 month: months field disappears! Show Dias, Horas, Minutos, Segundos
          dynamicUnits.push({ value: String(days).padStart(2, "0"), label: "Dias" });
          dynamicUnits.push({ value: String(hours).padStart(2, "0"), label: "Horas" });
          dynamicUnits.push({ value: String(minutes).padStart(2, "0"), label: "Minutos" });
          dynamicUnits.push({ value: String(seconds).padStart(2, "0"), label: "Segundos" });
        } else if (hours > 0) {
          // Less than 1 day: days field disappears! Show Horas, Minutos, Segundos
          dynamicUnits.push({ value: String(hours).padStart(2, "0"), label: "Horas" });
          dynamicUnits.push({ value: String(minutes).padStart(2, "0"), label: "Minutos" });
          dynamicUnits.push({ value: String(seconds).padStart(2, "0"), label: "Segundos" });
        } else {
          // Less than 1 hour: hours field disappears! Show Minutos, Segundos
          dynamicUnits.push({ value: String(minutes).padStart(2, "0"), label: "Minutos" });
          dynamicUnits.push({ value: String(seconds).padStart(2, "0"), label: "Segundos" });
        }

        setCountdown({
          title: "faltam para o grande dia",
          units: dynamicUnits,
        });
      } else if (now >= WEDDING_START_DATE && now <= WEDDING_END_DATE) {
        // During wedding: live celebration!
        const diffMs = now - WEDDING_START_DATE;
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

        setCountdown({
          title: "celebrando ao vivo!",
          units: [
            { value: String(hours).padStart(2, "0"), label: "Horas" },
            { value: String(minutes).padStart(2, "0"), label: "Minutos" },
            { value: String(seconds).padStart(2, "0"), label: "Segundos" },
          ],
        });
      } else {
        // After wedding: happily married
        const diffMs = now - WEDDING_START_DATE;
        const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const months = Math.floor(totalDays / 30);
        const days = totalDays % 30;
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        setCountdown({
          title: "felizmente casados",
          units: [
            { value: String(months).padStart(2, "0"), label: "Meses" },
            { value: String(days).padStart(2, "0"), label: "Dias" },
            { value: String(hours).padStart(2, "0"), label: "Horas" },
          ],
        });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  // Carousel Cards Data: Wedding Moments
  const moments = momentsConfig && momentsConfig.length > 0 ? momentsConfig : DEFAULT_WEDDING_MOMENTS;
  const activeMomentId = getCurrentActiveMomentId(moments);

  const carouselCards = moments.map((m) => {
    const momentPhotos = photos.filter((p) => p.moment === m.id);
    const coverImage = momentPhotos[0]?.url || m.fallbackImage;
    const isCurrentActive = m.id === activeMomentId;

    return {
      id: m.id,
      title: m.name,
      icon: m.icon,
      startTime: m.startTime,
      endTime: m.endTime,
      category: m.id,
      image: coverImage,
      count: momentPhotos.length,
      isCurrentActive,
      description: m.description,
    };
  });

  // Fluid 3D Coverflow Touch & Drag State
  const initialMomentIndex = moments.findIndex((m) => m.id === activeMomentId);
  const [activeCardIndex, setActiveCardIndex] = useState(initialMomentIndex >= 0 ? initialMomentIndex : 0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [cardSpacing, setCardSpacing] = useState(205);
  const dragStartXRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === "undefined") return;
      if (window.innerWidth >= 1024) {
        setCardSpacing(320);
      } else if (window.innerWidth >= 768) {
        setCardSpacing(270);
      } else if (window.innerWidth >= 640) {
        setCardSpacing(230);
      } else {
        setCardSpacing(205);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleNextCard = useCallback(() => {
    setActiveCardIndex((prev) => (prev + 1) % carouselCards.length);
  }, [carouselCards.length]);

  const handlePrevCard = useCallback(() => {
    setActiveCardIndex((prev) => (prev - 1 + carouselCards.length) % carouselCards.length);
  }, [carouselCards.length]);

  // Touch handlers
  const handleTouchStart = (clientX: number) => {
    dragStartXRef.current = clientX;
    isDraggingRef.current = true;
    setIsDragging(true);
    setDragOffset(0);
  };

  const handleTouchMove = (clientX: number) => {
    if (!isDraggingRef.current) return;
    const deltaX = clientX - dragStartXRef.current;
    // Limit drag range for a springy feel
    setDragOffset(deltaX * 0.95);
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    if (dragOffset < -45) {
      handleNextCard();
    } else if (dragOffset > 45) {
      handlePrevCard();
    }
    setDragOffset(0);
  };

  return (
    <div className="w-full max-w-md sm:max-w-3xl md:max-w-4xl lg:max-w-5xl mx-auto flex flex-col items-center bg-white select-none">
      {/* Top Media Header: Couple Background Photo with clean fade into white */}
      <div className="relative w-full h-[400px] sm:h-[460px] md:h-[520px] lg:h-[560px] overflow-hidden sm:rounded-3xl sm:mt-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/bg_photo_couple.jpg"
          alt="Caio & Sarah"
          className="w-full h-full object-cover object-[center_35%]"
        />

        {/* Soft top gradient for contrast and smooth bottom fade into pure white */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-white pointer-events-none" />

        {/* Floating subtle top buttons for Início and Telão */}
        <div className="absolute top-5 left-4 z-20">
          <Link
            href="/"
            className="p-2 sm:p-2.5 rounded-full bg-black/35 backdrop-blur-md text-white/90 hover:text-white hover:bg-black/55 border border-white/20 flex items-center justify-center transition-all shadow-sm"
            title="Início"
          >
            <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
          </Link>
        </div>
        <div className="absolute top-5 right-4 z-20 flex items-center gap-2">
          <Link
            href={`/e/${slug}/slideshow`}
            target="_blank"
            className="p-2 sm:p-2.5 rounded-full bg-black/35 backdrop-blur-md text-white/90 hover:text-white hover:bg-black/55 border border-white/20 flex items-center justify-center transition-all shadow-sm"
            title="Modo Telão"
          >
            <Tv className="w-4 h-4 sm:w-5 sm:h-5" />
          </Link>
        </div>

        {/* Intelligent Dynamic Countdown Card without Years (matching exemplo_nova_UI.jpeg) */}
        <div className="absolute top-5 inset-x-0 flex justify-center z-20 px-3 pointer-events-none">
          <div className="backdrop-blur-md bg-black/40 border border-white/25 rounded-2xl px-4 py-3 sm:px-6 sm:py-3.5 text-center shadow-lg max-w-[320px] sm:max-w-[380px] md:max-w-[430px] w-full pointer-events-auto">
            <p className="text-[11px] sm:text-xs text-white/85 font-normal mb-1.5 lowercase tracking-wide">
              {countdown.title}
            </p>
            <div className="flex items-center justify-center gap-2.5 sm:gap-4 text-white">
              {countdown.units.map((unit) => (
                <div key={unit.label} className="text-center min-w-[38px] sm:min-w-[46px] md:min-w-[52px]">
                  <span className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight font-sans block leading-none">
                    {unit.value}
                  </span>
                  <span className="block text-[8.5px] sm:text-[9.5px] md:text-[10.5px] uppercase tracking-wider text-white/70 font-medium mt-1">
                    {unit.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating Pill Badge, Couple Name & Date Overlay (identical to exemplo_nova_UI.jpeg) */}
        <div className="absolute bottom-2 sm:bottom-4 inset-x-0 flex flex-col items-center text-center px-4 z-10">
          {/* Status Pill Badge: Álbum ao vivo & Como funciona */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap justify-center">
            <div className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full bg-white/75 backdrop-blur-md border border-[#cb7d87]/30 text-[#cb7d87] text-xs sm:text-sm font-semibold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#cb7d87]" />
              <span>Álbum ao vivo</span>
            </div>
            <button
              type="button"
              onClick={() => openHowItWorksGuide()}
              className="inline-flex items-center gap-1.5 px-3 py-1 sm:py-1.5 rounded-full bg-white/80 hover:bg-white text-[#5a6248] hover:text-[#cb7d87] text-xs font-semibold backdrop-blur-md border border-[#cb7d87]/25 shadow-xs transition-colors cursor-pointer active:scale-95"
              title="Como funciona o Photo Party"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#cb7d87]" />
              <span>Como funciona?</span>
            </button>
          </div>

          {/* Couple Title: Caio & Sarah */}
          <h1 className="font-sans font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-gray-900 tracking-tight">
            {title || "Caio & Sarah"}
          </h1>

          {/* Date & Time */}
          <p className="text-xs sm:text-sm md:text-base text-gray-500 font-medium mt-0.5 sm:mt-1">
            11 de Dezembro 2026, 15:00h
          </p>
        </div>
      </div>

      {/* Contextual Table Welcome Card for the Guest */}
      <div className="w-full max-w-md sm:max-w-xl md:max-w-2xl px-4 mt-4 sm:mt-6">
        <GuestWelcomeCard
          tableName={tableName}
          onTakePhoto={() => {
            window.dispatchEvent(new CustomEvent("open-upload-modal"));
          }}
        />
      </div>

      {/* Central Navigation Bar (clean icons directly on pure white background) */}
      <div className="w-full max-w-md sm:max-w-xl md:max-w-2xl px-4 mt-4 sm:mt-6 bg-white">
        <div className="grid grid-cols-5 gap-1 items-center justify-between text-center">
          {/* 1. Fotos (opens Gallery view) */}
          <button
            id="nav-photos-button"
            onClick={() => {
              onSelectCategory("all");
              onTabChange("gallery");
            }}
            className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-gray-50 transition-all cursor-pointer group"
          >
            <div
              className={`p-2 rounded-2xl transition-colors ${
                activeTab === "gallery"
                  ? "text-[#cb7d87] bg-[#cb7d87]/10"
                  : "text-gray-600 group-hover:text-gray-900"
              }`}
            >
              <Camera className="w-6 h-6" />
            </div>
            <span
              className={`text-[11px] sm:text-xs mt-0.5 font-medium ${
                activeTab === "gallery" ? "text-[#cb7d87] font-semibold" : "text-gray-600"
              }`}
            >
              Fotos
            </span>
          </button>

          {/* 2. Desafios */}
          <button
            onClick={() => onTabChange("quests")}
            className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-gray-50 transition-all cursor-pointer group"
          >
            <div
              className={`p-2 rounded-2xl transition-colors ${
                activeTab === "quests"
                  ? "text-[#cb7d87] bg-[#cb7d87]/10"
                  : "text-gray-600 group-hover:text-gray-900"
              }`}
            >
              <Sparkles className="w-6 h-6" />
            </div>
            <span
              className={`text-[11px] sm:text-xs mt-0.5 font-medium ${
                activeTab === "quests" ? "text-[#cb7d87] font-semibold" : "text-gray-600"
              }`}
            >
              Desafios
            </span>
          </button>

          {/* 3. Recados ao vivo */}
          <button
            onClick={() => onTabChange("chat")}
            className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-gray-50 transition-all cursor-pointer group"
          >
            <div
              className={`p-2 rounded-2xl transition-colors relative ${
                activeTab === "chat"
                  ? "text-[#cb7d87] bg-[#cb7d87]/10"
                  : "text-gray-600 group-hover:text-gray-900"
              }`}
            >
              <MessageSquare className="w-6 h-6" />
              {/* Símbolo vermelho piscante que sinaliza transmissão Ao Vivo */}
              <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
            </div>
            <span
              className={`text-[10px] sm:text-xs mt-0.5 font-medium whitespace-nowrap ${
                activeTab === "chat" ? "text-[#cb7d87] font-semibold" : "text-gray-600"
              }`}
            >
              Recados ao vivo
            </span>
          </button>

          {/* 4. Livro Digital */}
          <Link
            href={`/e/${slug}/guestbook`}
            className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-gray-50 transition-all cursor-pointer group"
          >
            <div className="p-2 rounded-2xl text-gray-600 group-hover:text-gray-900 transition-colors">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="text-[11px] sm:text-xs mt-0.5 font-medium text-gray-600">
              Livro
            </span>
          </Link>

          {/* 5. Presentes (redireciona para o site do casamento abrindo o modal de presentes) */}
          <a
            href="https://caioesarah.vercel.app/?presentes=true"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-gray-50 transition-all cursor-pointer group"
            title="Lista de Presentes & Pix dos Noivos"
          >
            <div className="p-2 rounded-2xl text-gray-600 group-hover:text-[#cb7d87] group-hover:bg-[#cb7d87]/10 transition-colors">
              <Gift className="w-6 h-6 text-[#cb7d87]" />
            </div>
            <span className="text-[11px] sm:text-xs mt-0.5 font-medium text-gray-600 group-hover:text-[#cb7d87]">
              Presentes
            </span>
          </a>
        </div>
      </div>

      {/* Fluid 3D Coverflow Carousel (identical to exemplo_nova_UI.jpeg with adjacent items visible) */}
      <div id="moments-carousel-section" className="w-full mt-6 mb-8 px-0 sm:px-2">
        <div className="relative w-full flex items-center justify-center">
          {/* Prev Card Arrow */}
          <button
            onClick={handlePrevCard}
            className="absolute left-2 sm:left-4 md:left-6 lg:left-8 z-30 p-2 sm:p-2.5 md:p-3 rounded-full bg-black/45 hover:bg-black/70 text-white backdrop-blur-xs transition-transform active:scale-90 shadow-md cursor-pointer"
            aria-label="Card anterior"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Touch & Drag Carousel Track Container */}
          <div
            className="relative w-full h-[370px] sm:h-[410px] md:h-[450px] lg:h-[480px] overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
            onTouchStart={(e) => handleTouchStart(e.touches[0].clientX)}
            onTouchMove={(e) => handleTouchMove(e.touches[0].clientX)}
            onTouchEnd={handleTouchEnd}
            onMouseDown={(e) => handleTouchStart(e.clientX)}
            onMouseMove={(e) => {
              if (isDragging) handleTouchMove(e.clientX);
            }}
            onMouseUp={handleTouchEnd}
            onMouseLeave={() => {
              if (isDragging) handleTouchEnd();
            }}
          >
            {carouselCards.map((card, idx) => {
              // Calculate relative position to active index in a circular cycle
              let rel = idx - activeCardIndex;
              while (rel > carouselCards.length / 2) rel -= carouselCards.length;
              while (rel < -carouselCards.length / 2) rel += carouselCards.length;

              const isCenter = rel === 0;
              const isLeft = rel === -1;
              const isRight = rel === 1;
              const isHidden = !isCenter && !isLeft && !isRight;

              // Base X offset: Center is 0, Left is -cardSpacing, Right is +cardSpacing
              let baseX = 0;
              if (isLeft) baseX = -cardSpacing;
              if (isRight) baseX = cardSpacing;

              // Current dynamic offset factoring in drag
              const currentX = baseX + dragOffset;

              return (
                <div
                  key={card.id}
                  onClick={(e) => {
                    if (isLeft) {
                      e.stopPropagation();
                      handlePrevCard();
                    } else if (isRight) {
                      e.stopPropagation();
                      handleNextCard();
                    }
                  }}
                  style={{
                    transform: `translate(calc(-50% + ${currentX}px), -50%) scale(${
                      isCenter ? 1 : isHidden ? 0.7 : 0.88
                    })`,
                    zIndex: isCenter ? 20 : isHidden ? 0 : 10,
                    opacity: isCenter ? 1 : isHidden ? 0 : 0.76,
                    filter: isCenter ? "brightness(1)" : "brightness(0.88)",
                    transition: isDragging
                      ? "none"
                      : "transform 420ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 420ms ease, filter 420ms ease",
                    pointerEvents: isHidden ? "none" : "auto",
                  }}
                  className={`absolute top-1/2 left-1/2 rounded-3xl overflow-hidden cursor-pointer select-none shadow-xl ${
                    isCenter
                      ? "w-[245px] sm:w-[275px] md:w-[310px] lg:w-[330px] h-[345px] sm:h-[385px] md:h-[425px] lg:h-[450px] ring-1 ring-black/10 shadow-2xl"
                      : "w-[220px] sm:w-[250px] md:w-[275px] lg:w-[295px] h-[320px] sm:h-[355px] md:h-[390px] lg:h-[415px]"
                  }`}
                >
                  {/* Card Background Image */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.image}
                    alt={card.title}
                    draggable={false}
                    className="w-full h-full object-cover pointer-events-none"
                  />

                  {/* Gradient Overlay for high readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/55 pointer-events-none" />

                  {/* Card Center-Top Header */}
                  <div className="absolute top-4 inset-x-3 text-center z-10 pointer-events-none">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/45 backdrop-blur-xs text-[10px] sm:text-[11px] text-white/90 font-medium mb-1.5 border border-white/20 shadow-xs">
                      <span>{card.icon}</span>
                      <span>{card.startTime} - {card.endTime}</span>
                      {card.isCurrentActive && (
                        <span className="ml-1 px-1.5 py-0.2 bg-[#cb7d87] text-white rounded-full text-[8.5px] font-bold uppercase tracking-wider animate-pulse">
                          Agora
                        </span>
                      )}
                    </div>
                    <h3 className="font-sans font-bold text-lg sm:text-xl md:text-2xl text-white drop-shadow-md tracking-tight">
                      {card.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-white/80 font-normal mt-0.5">
                      {card.count > 0
                        ? `${card.count} ${card.count === 1 ? "foto" : "fotos"}`
                        : "Ainda sem fotos"}
                    </p>
                  </div>

                  {/* Card Bottom Action Button (Smart Action) */}
                  <div className="absolute bottom-5 inset-x-5 flex justify-center z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isCenter) {
                          if (card.count > 0) {
                            onSelectCategory(card.category);
                            onTabChange("gallery");
                          } else {
                            window.dispatchEvent(
                              new CustomEvent("open-upload-modal", {
                                detail: { moment: card.id },
                              })
                            );
                          }
                        } else if (isLeft) {
                          handlePrevCard();
                        } else if (isRight) {
                          handleNextCard();
                        }
                      }}
                      className={`w-full py-2.5 sm:py-3 px-4 rounded-full font-semibold text-xs sm:text-sm backdrop-blur-md shadow-md transition-all active:scale-95 cursor-pointer text-center border ${
                        isCenter
                          ? card.count > 0
                            ? "bg-white/90 hover:bg-white text-gray-900 border-white/60"
                            : "bg-[#cb7d87] hover:bg-[#b86a76] text-white border-[#cb7d87]/60 shadow-lg font-bold"
                          : "bg-white/60 text-gray-900 border-white/30"
                      }`}
                    >
                      {card.count > 0 ? "Ver fotos" : "Registrar momento"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Next Card Arrow */}
          <button
            onClick={handleNextCard}
            className="absolute right-2 sm:right-4 md:right-6 lg:right-8 z-30 p-2 sm:p-2.5 md:p-3 rounded-full bg-black/45 hover:bg-black/70 text-white backdrop-blur-xs transition-transform active:scale-90 shadow-md cursor-pointer"
            aria-label="Próximo card"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Dots Indicator */}
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {carouselCards.map((c, idx) => (
            <button
              key={c.id}
              onClick={() => setActiveCardIndex(idx)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === activeCardIndex ? "w-6 bg-[#cb7d87]" : "w-1.5 bg-gray-300"
              }`}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
