"use client";

import React, { useState, useEffect } from "react";
import {
  HelpCircle,
  X,
  Camera,
  MessageSquare,
  Tv,
  Heart,
  ShieldCheck,
  Download,
  Sparkles,
  PartyPopper,
} from "lucide-react";
import { MonogramLogo } from "@/components/MonogramLogo";

export function openHowItWorksGuide() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("photo_party_open_guide"));
  }
}

interface HowItWorksModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  trigger?: "navbar" | "floating" | "icon" | "none";
  buttonText?: string;
  className?: string;
  autoOpenFirstTime?: boolean;
  storageKey?: string;
}

export function HowItWorksModal({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  trigger = "navbar",
  buttonText = "Como Funciona?",
  className = "",
  autoOpenFirstTime = true,
  storageKey = "photo_party_has_seen_guide",
}: HowItWorksModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const isControlled = controlledIsOpen !== undefined;
  const open = isControlled ? controlledIsOpen : internalIsOpen;

  const handleOpen = () => {
    if (!isControlled) {
      setInternalIsOpen(true);
    }
  };

  const handleClose = () => {
    try {
      localStorage.setItem(storageKey, "true");
    } catch {
      // ignore
    }
    if (isControlled) {
      controlledOnClose?.();
    } else {
      setInternalIsOpen(false);
    }
  };

  // Check if first-time user and open automatically once
  useEffect(() => {
    if (!autoOpenFirstTime) return;
    try {
      const hasSeen = localStorage.getItem(storageKey);
      if (!hasSeen) {
        const timer = setTimeout(() => {
          if (!isControlled) {
            setInternalIsOpen(true);
          }
        }, 600);
        return () => clearTimeout(timer);
      }
    } catch {
      // ignore
    }
  }, [autoOpenFirstTime, storageKey, isControlled]);

  // Listen for global open requests from other buttons (e.g. floating button)
  useEffect(() => {
    const handleOpenEvent = () => {
      if (!isControlled) {
        setInternalIsOpen(true);
      }
    };
    window.addEventListener("photo_party_open_guide", handleOpenEvent);
    return () => {
      window.removeEventListener("photo_party_open_guide", handleOpenEvent);
    };
  }, [isControlled]);

  // Lock body scroll and listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [open]);

  const steps = [
    {
      icon: Camera,
      iconColor: "text-[#cb7d87]",
      badgeBg: "bg-[#cb7d87]/15",
      title: "1. Tire ou Escolha Fotos",
      desc: "Toque em 'Tirar Foto' para abrir a câmera direto no seu celular, ou em 'Galeria' para enviar fotos já salvas. A foto é comprimida no seu aparelho para carregar em menos de 1 segundo!",
    },
    {
      icon: MessageSquare,
      iconColor: "text-[#5a6248]",
      badgeBg: "bg-[#5a6248]/15",
      title: "2. Seu Nome e Dedicatória",
      desc: "Assine com seu nome e deixe um recado carinhoso para os noivos. Se você escaneou o QR Code na mesa, suas fotos já ficam marcadas com o nome da sua mesa!",
    },
    {
      icon: Tv,
      iconColor: "text-[#832d3b]",
      badgeBg: "bg-[#ebca90]/30",
      title: "3. Telão em Tempo Real",
      desc: "As fotos enviadas pelos convidados aparecem quase instantaneamente no telão principal da festa para todos celebrarem juntos.",
    },
    {
      icon: Heart,
      iconColor: "text-rose-600",
      badgeBg: "bg-rose-100",
      title: "4. Curta e Comente",
      desc: "Dê dois toques em qualquer foto para curtir com coração ❤️ e interaja com os outros convidados deixando comentários animados.",
    },
    {
      icon: ShieldCheck,
      iconColor: "text-emerald-700",
      badgeBg: "bg-emerald-100",
      title: "5. Privacidade e Controle",
      desc: "Você tem total liberdade para apagar fotos e comentários enviados pelo seu próprio celular a qualquer momento. Suas fotos são protegidas contra exclusão por outros convidados.",
    },
    {
      icon: Download,
      iconColor: "text-[#5a6248]",
      badgeBg: "bg-[#7c8764]/15",
      title: "6. Baixe suas Lembranças",
      desc: "Toque em qualquer foto na galeria para vê-la em tamanho grande e use o botão de download para salvar no seu celular em alta resolução.",
    },
  ];

  return (
    <>
      {/* Trigger Buttons according to style */}
      {trigger === "navbar" && (
        <button
          type="button"
          onClick={handleOpen}
          className={`flex items-center gap-1.5 text-xs text-[#5a6248] hover:text-[#cb7d87] bg-[#fffaf5] hover:bg-[#fbead6] px-3 py-1.5 rounded-full border border-[#cb7d87]/25 shadow-xs transition-colors font-medium active:scale-95 ${className}`}
          title="Como funciona a plataforma"
        >
          <HelpCircle className="w-3.5 h-3.5 text-[#cb7d87]" />
          <span className="hidden sm:inline">{buttonText}</span>
          <span className="sm:hidden font-bold">?</span>
        </button>
      )}

      {trigger === "floating" && (
        <button
          type="button"
          onClick={handleOpen}
          className={`pointer-events-auto flex items-center justify-center w-12 h-12 bg-[#fffaf5] hover:bg-[#fbead6] active:scale-95 text-[#5a6248] hover:text-[#cb7d87] rounded-full shadow-[0_6px_20px_rgba(90,98,72,0.22)] transition-all duration-200 border border-[#cb7d87]/35 ${className}`}
          title="Como funciona a plataforma?"
          aria-label="Como funciona?"
        >
          <HelpCircle className="w-6 h-6 text-[#cb7d87]" />
        </button>
      )}

      {trigger === "icon" && (
        <button
          type="button"
          onClick={handleOpen}
          className={`p-1.5 text-[#5a6248] hover:text-[#cb7d87] bg-[#fffaf5] hover:bg-[#fbead6] rounded-full transition-colors ${className}`}
          title="Como funciona a plataforma"
          aria-label="Como funciona"
        >
          <HelpCircle className="w-4 h-4 text-[#cb7d87]" />
        </button>
      )}

      {/* Modal Dialog */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="how-it-works-title"
          className="fixed inset-0 z-50 overflow-y-auto bg-[#49503b]/65 backdrop-blur-sm overscroll-contain animate-fade-in"
          style={{ WebkitOverflowScrolling: "touch" }}
          onClick={handleClose}
        >
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg transform rounded-3xl bg-[#fffaf5] border border-[#cb7d87]/30 p-6 sm:p-7 text-left shadow-2xl transition-all relative text-[#49503b] space-y-5 my-8 animate-scale-in"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 text-[#5a6248] hover:text-[#cb7d87] hover:bg-[#fbead6] rounded-full transition-colors z-10"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="text-center pt-2">
                <div className="inline-flex items-center justify-center p-2.5 rounded-full bg-[#cb7d87]/15 mb-2.5">
                  <MonogramLogo size={44} color="#cb7d87" />
                </div>
                <div className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-[0.2em] text-[#cb7d87] font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Guia do Convidado</span>
                </div>
                <h3 id="how-it-works-title" className="font-serif text-2xl sm:text-3xl text-[#5a6248] mt-1 font-light">
                  Como Funciona o Photo Party
                </h3>
                <p className="text-xs text-[#7c8764] mt-1.5 max-w-sm mx-auto leading-relaxed">
                  Nossa galeria ao vivo e colaborativa. Tire fotos, deixe recados e celebre cada detalhe conosco!
                </p>
              </div>

              {/* Steps / Feature Cards */}
              <div className="space-y-3 pt-1">
                {steps.map((step, idx) => {
                  const IconComponent = step.icon;
                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-3.5 p-3 sm:p-3.5 rounded-2xl bg-white/80 border border-[#cb7d87]/20 shadow-xs hover:border-[#cb7d87]/40 transition-colors"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl ${step.badgeBg} flex items-center justify-center shrink-0 mt-0.5`}
                      >
                        <IconComponent className={`w-5 h-5 ${step.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-serif text-base font-semibold text-[#5a6248] leading-snug">
                          {step.title}
                        </h4>
                        <p className="text-xs text-[#7c8764] mt-0.5 leading-relaxed">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Call to Action */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full flex items-center justify-center gap-2 bg-[#cb7d87] hover:bg-[#b86a76] active:scale-[0.99] text-[#fffaf5] py-3.5 rounded-2xl font-serif text-lg tracking-wide shadow-md transition-all"
                >
                  <PartyPopper className="w-5 h-5 text-[#ebca90]" />
                  <span>Entendi, vamos comemorar!</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
