"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Sparkles, ChevronRight, X, Check } from "lucide-react";

export interface SpotlightStep {
  targetId: string;
  title: string;
  description: string;
  preferredPlacement?: "top" | "bottom";
}

const DEFAULT_STEPS: SpotlightStep[] = [
  {
    targetId: "guest-upload-button",
    title: "📸 Tire fotos e compartilhe",
    description:
      "Toque aqui a qualquer momento para abrir sua câmera ou escolher da galeria e mandar direto para o telão da festa.",
    preferredPlacement: "top",
  },
  {
    targetId: "nav-photos-button",
    title: "🖼️ Galeria ao Vivo",
    description:
      "Veja todas as fotos tiradas pelos convidados, curta com coração ❤️ e salve as suas preferidas no celular.",
    preferredPlacement: "bottom",
  },
  {
    targetId: "moments-carousel-section",
    title: "⏳ Linha do Tempo",
    description:
      "Acompanhe as fases da celebração (Cerimônia, Jantar e Festa) conforme o casamento acontece.",
    preferredPlacement: "top",
  },
];

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export function startSpotlightTour() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("photo_party_start_tour"));
  }
}

export function SpotlightTour({
  storageKey = "photo_party_spotlight_completed",
  autoStartDelay = 900,
}: {
  storageKey?: string;
  autoStartDelay?: number;
}) {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const steps = DEFAULT_STEPS;

  const currentStep = steps[currentStepIndex];

  const updateTargetPosition = useCallback(() => {
    if (!currentStep) return;
    const el = document.getElementById(currentStep.targetId);
    if (!el) {
      setTargetRect(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    // Padding around the target for breathing room
    const pad = 8;
    setTargetRect({
      top: Math.max(0, rect.top - pad),
      left: Math.max(0, rect.left - pad),
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
      bottom: rect.bottom + pad,
      right: rect.right + pad,
    });
  }, [currentStep]);

  // Check if first-time guest and start tour after initial delay
  useEffect(() => {
    try {
      const completed = localStorage.getItem(storageKey);
      if (!completed) {
        const timer = setTimeout(() => {
          setIsActive(true);
          setCurrentStepIndex(0);
        }, autoStartDelay);
        return () => clearTimeout(timer);
      }
    } catch {
      // ignore local storage errors
    }
  }, [storageKey, autoStartDelay]);

  // Listen for manual restart event
  useEffect(() => {
    const handleStart = () => {
      setIsActive(true);
      setCurrentStepIndex(0);
    };
    window.addEventListener("photo_party_start_tour", handleStart);
    return () => window.removeEventListener("photo_party_start_tour", handleStart);
  }, []);

  // Recalculate target position when step changes, on resize, and on scroll
  useEffect(() => {
    if (!isActive || !currentStep) return;

    // Scroll element into view smoothly if not visible
    const el = document.getElementById(currentStep.targetId);
    if (el) {
      const rect = el.getBoundingClientRect();
      const inView =
        rect.top >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);
      if (!inView) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    updateTargetPosition();

    const handleScrollOrResize = () => {
      updateTargetPosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, { passive: true });
    window.addEventListener("resize", handleScrollOrResize);

    // Minor delayed check to allow smooth scroll completion
    const checkTimer = setTimeout(updateTargetPosition, 320);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);
      clearTimeout(checkTimer);
    };
  }, [isActive, currentStep, currentStepIndex, updateTargetPosition]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    try {
      localStorage.setItem(storageKey, "true");
    } catch {
      // ignore
    }
    setIsActive(false);
  };

  if (!isActive || !currentStep) {
    return null;
  }

  // Calculate tooltip popover positioning
  const isTargetAtBottom =
    currentStep.preferredPlacement === "top" ||
    (targetRect ? targetRect.top > (typeof window !== "undefined" ? window.innerHeight * 0.55 : 400) : true);

  return (
    <div
      role="dialog"
      aria-label="Tour guiado pelo app"
      className="fixed inset-0 z-50 overflow-hidden select-none animate-fade-in"
    >
      {/* SVG Mask Cutout */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-auto"
        style={{ width: "100vw", height: "100vh" }}
      >
        <defs>
          <mask id="spotlight-hole-mask">
            {/* White background reveals the darkened overlay */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black cutout punches hole around target */}
            {targetRect && (
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx="20"
                ry="20"
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* Dark backdrop rect with mask */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.72)"
          mask="url(#spotlight-hole-mask)"
          onClick={handleNext}
        />
      </svg>

      {/* Animated glowing border around active target */}
      {targetRect && (
        <div
          style={{
            top: `${targetRect.top}px`,
            left: `${targetRect.left}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`,
          }}
          className="fixed rounded-[20px] ring-3 ring-[#cb7d87] ring-offset-2 ring-offset-black/40 pointer-events-none transition-all duration-300 animate-pulse"
        />
      )}

      {/* Header bar: "Pular tutorial" button */}
      <div className="fixed top-4 right-4 z-50">
        <button
          type="button"
          onClick={handleComplete}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-black/60 hover:bg-black/80 text-white/90 hover:text-white text-xs font-semibold backdrop-blur-md border border-white/20 shadow-lg transition-all active:scale-95 cursor-pointer"
        >
          <span>Pular tutorial</span>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Tooltip Card */}
      <div
        className="fixed inset-x-4 z-50 flex justify-center pointer-events-none"
        style={{
          ...(targetRect
            ? isTargetAtBottom
              ? { bottom: `${Math.max(16, (typeof window !== "undefined" ? window.innerHeight : 800) - targetRect.top + 16)}px` }
              : { top: `${Math.max(16, targetRect.bottom + 16)}px` }
            : { bottom: "40px" }),
        }}
      >
        <div className="pointer-events-auto w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-[#cb7d87]/30 text-gray-900 animate-scale-in">
          {/* Step Pill */}
          <div className="flex items-center justify-between mb-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#cb7d87]/15 text-[#cb7d87] text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                Passo {currentStepIndex + 1} de {steps.length}
              </span>
            </div>

            {/* Dots */}
            <div className="flex items-center gap-1.5">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentStepIndex ? "w-5 bg-[#cb7d87]" : "w-1.5 bg-gray-200"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Title & Description */}
          <h4 className="font-sans font-bold text-lg text-gray-900 leading-snug">
            {currentStep.title}
          </h4>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">
            {currentStep.description}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 mt-4 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={handleComplete}
              className="text-xs font-medium text-gray-500 hover:text-gray-900 px-2 py-1.5 cursor-pointer"
            >
              Pular
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 bg-[#cb7d87] hover:bg-[#b86a76] active:scale-95 text-white font-semibold text-xs px-5 py-2.5 rounded-full shadow-md transition-all cursor-pointer"
            >
              <span>{currentStepIndex < steps.length - 1 ? "Próximo" : "Entendi, vamos lá!"}</span>
              {currentStepIndex < steps.length - 1 ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
