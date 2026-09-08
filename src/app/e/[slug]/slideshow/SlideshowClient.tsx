"use client";

import React, { useState, useEffect } from "react";
import { MonogramLogo } from "@/components/MonogramLogo";
import { Sparkles, Maximize, Minimize } from "lucide-react";

interface SlideshowPhoto {
  id: string;
  url: string;
  guestName: string | null;
  message: string | null;
  tableIdentifier: string | null;
}

interface SlideshowClientProps {
  slug: string;
  eventTitle: string;
  initialPhotos: SlideshowPhoto[];
  qrCodeDataUrl: string;
}

export function SlideshowClient({
  slug,
  eventTitle,
  initialPhotos,
  qrCodeDataUrl,
}: SlideshowClientProps) {
  const [photos, setPhotos] = useState<SlideshowPhoto[]>(initialPhotos);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Poll for new photos every 5 seconds
  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const res = await fetch(`/api/events/${slug}/photos`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.photos)) {
            setPhotos(data.photos);
          }
        }
      } catch (err) {
        console.warn("Slideshow poll error:", err);
      }
    };

    const interval = setInterval(fetchPhotos, 5000);
    return () => clearInterval(interval);
  }, [slug]);

  // Auto cycle photos every 6 seconds
  useEffect(() => {
    if (photos.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [photos.length]);

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

  return (
    <div className="fixed inset-0 bg-[#353b2a] text-[#fbead6] flex flex-col justify-between overflow-hidden select-none">
      {/* Top Overlay Bar */}
      <div className="relative z-20 flex items-center justify-between px-8 py-5 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center gap-3">
          <MonogramLogo size={42} color="#fbead6" />
          <div>
            <h1 className="font-serif text-2xl tracking-wide font-light text-white">
              {eventTitle}
            </h1>
            <p className="text-xs text-[#ebca90] tracking-wider uppercase">
              Galeria ao Vivo
            </p>
          </div>
        </div>

        <button
          onClick={toggleFullscreen}
          className="p-2 text-white/80 hover:text-white bg-black/30 rounded-full backdrop-blur-xs transition-colors cursor-pointer"
          title="Alternar Tela Cheia"
        >
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </button>
      </div>

      {/* Main Slideshow Center View */}
      <div className="flex-1 relative flex items-center justify-center p-6">
        {photos.length === 0 ? (
          <div className="text-center bg-black/40 backdrop-blur-md p-10 rounded-3xl border border-[#cb7d87]/30 max-w-md">
            <Sparkles className="w-12 h-12 text-[#ebca90] mx-auto mb-3" />
            <h2 className="font-serif text-3xl text-white">Aguardando Fotos</h2>
            <p className="text-xs text-[#fbead6]/80 mt-2">
              Aponte a câmera para o QR Code no canto inferior para enviar a primeira foto da festa!
            </p>
          </div>
        ) : (
          <div className="relative max-h-[82vh] max-w-[90vw] flex flex-col items-center justify-center animate-fade-in transition-all duration-700">
            {/* Main Photo with soft shadow and frame */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={currentPhoto.id}
              src={currentPhoto.url}
              alt={currentPhoto.guestName || "Foto do Casamento"}
              className="max-h-[75vh] w-auto object-contain rounded-2xl shadow-2xl border border-white/20 transition-opacity duration-500"
            />

            {/* Dedication and Table Badge Banner */}
            {(currentPhoto.tableIdentifier || currentPhoto.guestName || currentPhoto.message) && (
              <div className="mt-4 bg-black/65 backdrop-blur-md px-6 py-2.5 rounded-full border border-white/15 flex items-center gap-3 shadow-lg">
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
      </div>

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
