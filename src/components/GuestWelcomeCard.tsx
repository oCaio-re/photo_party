"use client";

import React, { useState, useEffect } from "react";
import {
  Camera,
  HelpCircle,
  Sparkles,
  Tv,
  MessageSquare,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { openHowItWorksGuide } from "./HowItWorksModal";
import { startSpotlightTour } from "./SpotlightTour";

interface GuestWelcomeCardProps {
  tableName?: string;
  onTakePhoto?: () => void;
  className?: string;
}

export function GuestWelcomeCard({
  tableName,
  onTakePhoto,
  className = "",
}: GuestWelcomeCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("photo_party_welcome_collapsed");
      if (saved === "true") {
        setIsCollapsed(true);
      }
    } catch {
      // Ignore localStorage read errors in private browsing/restricted environments
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("photo_party_welcome_collapsed", String(next));
      } catch {
        // Ignore localStorage write errors
      }
      return next;
    });
  };

  const handleOpenUpload = () => {
    if (onTakePhoto) {
      onTakePhoto();
    } else {
      window.dispatchEvent(new CustomEvent("open-upload-modal"));
    }
  };

  return (
    <div
      className={`w-full bg-gradient-to-br from-[#fffaf5] via-white to-[#fbead6]/40 border border-[#cb7d87]/30 text-gray-900 shadow-xs transition-all duration-300 ${
        isCollapsed ? "rounded-2xl p-3 sm:p-4" : "rounded-3xl p-5 sm:p-6 shadow-sm"
      } ${className}`}
    >
      {isCollapsed ? (
        /* Collapsed View: Compact slim bar */
        <div className="flex items-center justify-between gap-3">
          <div
            onClick={toggleCollapse}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer select-none group"
            title="Clique para expandir o card de boas-vindas"
          >
            <div className="w-8 h-8 rounded-xl bg-[#cb7d87]/15 flex items-center justify-center shrink-0 text-[#cb7d87] group-hover:bg-[#cb7d87]/25 transition-colors">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-sans font-bold text-sm sm:text-base text-gray-900 tracking-tight truncate group-hover:text-[#cb7d87] transition-colors">
                {tableName ? `Olá, convidados da ${tableName}! 🥂` : "Olá, convidado especial! 🥂"}
              </h2>
              <p className="text-[11px] text-gray-500 truncate hidden xs:block sm:block">
                {tableName ? `Conectado à ${tableName} • Toque para ver o guia` : "Toque aqui para ver o guia e passos"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenUpload}
              className="flex items-center gap-1.5 bg-[#cb7d87] hover:bg-[#b86a76] active:scale-95 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">Tirar Foto</span>
            </button>

            <button
              type="button"
              onClick={toggleCollapse}
              className="p-1.5 rounded-full hover:bg-[#cb7d87]/15 active:bg-[#cb7d87]/25 text-gray-600 hover:text-[#cb7d87] transition-colors cursor-pointer"
              title="Expandir card de boas-vindas"
              aria-label="Expandir card de boas-vindas"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        /* Expanded View */
        <>
          {/* Top Bar with Badge and Chevron Collapse Button */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#cb7d87]/15 text-[#cb7d87] text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{tableName ? `Conectado à ${tableName}` : "Bem-vindo ao Casamento"}</span>
            </div>

            <button
              type="button"
              onClick={toggleCollapse}
              className="p-1.5 -mr-1 -mt-1 rounded-full hover:bg-black/5 active:bg-black/10 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
              title="Encolher card de boas-vindas"
              aria-label="Encolher card de boas-vindas"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          </div>

          {/* Header Content */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-sans font-bold text-xl sm:text-2xl text-gray-900 tracking-tight">
                {tableName ? `Olá, convidados da ${tableName}! 🥂` : "Olá, convidado especial! 🥂"}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5 leading-relaxed">
                Tire fotos, deixe seu recado carinhoso e veja tudo passar ao vivo no telão principal dos noivos!
              </p>
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={handleOpenUpload}
              className="shrink-0 flex items-center gap-2 bg-[#cb7d87] hover:bg-[#b86a76] active:scale-95 text-white font-semibold text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-md transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4 text-white" />
              <span>Tirar Foto Agora</span>
            </button>
          </div>

          {/* 3 Step Visual Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-3 border-t border-gray-100/80">
            <div className="flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl bg-white/80 border border-gray-100 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-[#cb7d87]/10 flex items-center justify-center shrink-0 text-[#cb7d87]">
                <Camera className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-[#cb7d87] tracking-wider block">1. Foto</span>
                <p className="text-xs font-semibold text-gray-800 truncate">Tire ou escolha</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl bg-white/80 border border-gray-100 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-[#5a6248]/10 flex items-center justify-center shrink-0 text-[#5a6248]">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-[#5a6248] tracking-wider block">2. Recado</span>
                <p className="text-xs font-semibold text-gray-800 truncate">Assine seu nome</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl bg-white/80 border border-gray-100 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-600">
                <Tv className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider block">3. Telão</span>
                <p className="text-xs font-semibold text-gray-800 truncate">Ao vivo na festa</p>
              </div>
            </div>
          </div>

          {/* Helpful Links Footer */}
          <div className="flex items-center justify-between flex-wrap gap-2 mt-3 pt-2 text-[11px] text-gray-500">
            <button
              type="button"
              onClick={() => openHowItWorksGuide()}
              className="inline-flex items-center gap-1.5 text-[#5a6248] hover:text-[#cb7d87] font-medium transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#cb7d87]" />
              <span>Dúvidas? Veja o guia completo com 6 passos</span>
            </button>

            <button
              type="button"
              onClick={() => startSpotlightTour()}
              className="text-[#cb7d87] hover:underline font-medium cursor-pointer"
            >
              ✨ Rever tour pelo app
            </button>
          </div>
        </>
      )}
    </div>
  );
}
