"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { MonogramLogo } from "@/components/MonogramLogo";
import { Printer, ArrowLeft, Heart, MessageSquare, Video, Sparkles, QrCode } from "lucide-react";

export interface GuestbookEntry {
  id: string;
  url: string;
  mediaType: "photo" | "video";
  guestName: string | null;
  message: string | null;
  tableIdentifier: string | null;
  questTitle: string | null;
  likeCount: number;
  commentCount: number;
  createdAt: string | number | Date;
  videoQrCodeUrl?: string | null;
}

interface GuestbookClientProps {
  slug: string;
  eventTitle: string;
  entries: GuestbookEntry[];
  eventQrCodeUrl: string;
  formattedEventDate: string;
}

export function GuestbookClient({
  slug,
  eventTitle,
  entries,
  eventQrCodeUrl,
  formattedEventDate,
}: GuestbookClientProps) {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-[#fffaf5] text-[#353b2a] pb-24 print:bg-white print:p-0 print:pb-0">
      {/* Top Floating / Navigation Bar (hidden on print) */}
      <header className="sticky top-0 z-30 bg-[#fffaf5]/90 backdrop-blur-md border-b border-[#cb7d87]/20 px-4 py-3 print:hidden">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <Link
            href={`/e/${slug}`}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#5a6248] hover:text-[#cb7d87] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para o Mural</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 bg-[#cb7d87] hover:bg-[#b86a76] active:scale-95 text-white px-4 py-2 rounded-full font-serif text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#ebca90]" />
              <span>Imprimir Livro (PDF)</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        {/* Editorial Cover Spread */}
        <section className="text-center pb-12 sm:pb-16 border-b border-[#cb7d87]/20 print:border-b-2 print:border-black/20 print:pb-8 print:pt-4">
          <div className="flex justify-center mb-4">
            <MonogramLogo size={56} color="#cb7d87" />
          </div>

          <span className="text-xs uppercase tracking-[0.25em] text-[#cb7d87] font-semibold">
            Livro de Recordações & Mensagens
          </span>

          <h1 className="font-serif text-3xl sm:text-5xl text-[#5a6248] mt-2 font-medium tracking-tight">
            {eventTitle}
          </h1>

          <p className="font-serif text-sm sm:text-base text-[#7c8764] italic mt-2">
            {formattedEventDate}
          </p>

          <p className="max-w-xl mx-auto text-xs sm:text-sm text-[#49503b] mt-4 leading-relaxed">
            Uma compilação de fotos, vídeos e dedicatórias deixadas pelos nossos convidados de cada
            mesa, capturando a energia, os brindes e o amor deste dia inesquecível.
          </p>

          <div className="mt-6 inline-flex items-center gap-4 bg-[#fbead6]/50 border border-[#cb7d87]/20 px-4 py-2 rounded-2xl print:hidden">
            <span className="text-xs text-[#5a6248] font-medium">
              ✨ {entries.length} memórias registradas
            </span>
            <span>•</span>
            <span className="text-xs text-[#5a6248] font-medium">
              🎥 Vídeos com QR Code para reprodução
            </span>
          </div>
        </section>

        {/* Entries Layout */}
        {entries.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-[#cb7d87]/15 flex items-center justify-center text-[#cb7d87] mx-auto mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl text-[#5a6248]">Nenhuma memória ainda</h3>
            <p className="text-xs text-[#7c8764] mt-1">
              As fotos e vídeos com dedicatórias dos convidados aparecerão aqui no livro digital.
            </p>
          </div>
        ) : (
          <section className="py-10 space-y-8 sm:space-y-12">
            {entries.map((entry, idx) => (
              <article
                key={entry.id}
                className="bg-white rounded-3xl border border-[#cb7d87]/20 p-5 sm:p-7 shadow-xs print:shadow-none print:border-gray-200 print:rounded-2xl print:break-inside-avoid print:my-6 transition-all"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Media Column (Left) */}
                  <div className="md:col-span-5 relative">
                    <div className="relative rounded-2xl overflow-hidden bg-[#fbead6]/30 border border-[#cb7d87]/15 shadow-2xs">
                      {entry.mediaType === "video" ? (
                        <div className="relative aspect-4/3 sm:aspect-square flex items-center justify-center bg-black">
                          <video
                            src={entry.url}
                            controls
                            playsInline
                            preload="metadata"
                            className="w-full h-full object-contain"
                          />
                          <span className="absolute top-2 left-2 text-[10px] font-semibold bg-black/70 text-white px-2 py-0.5 rounded-full flex items-center gap-1 print:hidden">
                            <Video className="w-3 h-3 text-[#ebca90]" />
                            <span>Vídeo (15s)</span>
                          </span>
                        </div>
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={entry.url}
                          alt={entry.guestName ? `Foto de ${entry.guestName}` : "Foto do casamento"}
                          loading="lazy"
                          className="w-full h-auto object-cover max-h-[380px]"
                        />
                      )}
                    </div>

                    {/* Table Pill */}
                    {entry.tableIdentifier && (
                      <span className="absolute -bottom-2.5 left-4 text-[10px] uppercase tracking-wider font-semibold bg-[#5a6248] text-[#fbead6] px-3 py-1 rounded-full shadow-xs">
                        {entry.tableIdentifier}
                      </span>
                    )}
                  </div>

                  {/* Editorial Dedication Column (Right) */}
                  <div className="md:col-span-7 flex flex-col justify-between h-full space-y-4 pt-2 md:pt-0">
                    <div>
                      {/* Quest Badge if present */}
                      {entry.questTitle && (
                        <div className="inline-flex items-center gap-1 text-[11px] font-medium bg-[#cb7d87]/15 text-[#832d3b] px-2.5 py-0.5 rounded-full mb-3">
                          <span>🎯</span>
                          <span>Desafio: {entry.questTitle}</span>
                        </div>
                      )}

                      {/* Dedication Message */}
                      {entry.message ? (
                        <blockquote className="font-serif text-lg sm:text-2xl text-[#3f4633] italic leading-relaxed">
                          &ldquo;{entry.message}&rdquo;
                        </blockquote>
                      ) : (
                        <p className="font-serif text-base text-[#7c8764] italic">
                          Um momento especial capturado para os noivos.
                        </p>
                      )}

                      {/* Author */}
                      <div className="mt-3">
                        <p className="font-serif text-base text-[#cb7d87] font-medium">
                          — {entry.guestName || "Convidado Anônimo"}
                        </p>
                        <p className="text-[11px] text-[#7c8764] mt-0.5">
                          {new Date(entry.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Footer Row: Likes / Comments & Video QR Code */}
                    <div className="pt-3 border-t border-[#cb7d87]/15 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 text-xs text-[#5a6248]">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                          <strong className="font-semibold">{entry.likeCount}</strong> curtidas
                        </span>
                        {entry.commentCount > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5 text-[#5a6248]" />
                            <strong className="font-semibold">{entry.commentCount}</strong> comentários
                          </span>
                        )}
                      </div>

                      {/* QR Code for Video clip print-ready playback */}
                      {entry.mediaType === "video" && entry.videoQrCodeUrl && (
                        <div className="flex items-center gap-2 bg-[#fffaf5] border border-[#cb7d87]/25 p-2 rounded-xl">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={entry.videoQrCodeUrl}
                            alt="QR Code do Vídeo"
                            className="w-12 h-12 object-contain"
                          />
                          <div className="text-[9px] text-[#7c8764] leading-tight max-w-[90px]">
                            <span className="font-semibold text-[#832d3b] block">Ver Vídeo</span>
                            Aponte a câmera para assistir
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        {/* Closing Page / Back Cover */}
        <footer className="mt-16 pt-8 pb-12 border-t border-[#cb7d87]/20 text-center print:pt-6 print:border-t-2">
          <div className="flex justify-center mb-3">
            <MonogramLogo size={36} color="#5a6248" />
          </div>
          <p className="font-serif text-lg text-[#5a6248]">Com amor e gratidão,</p>
          <p className="font-serif text-xl font-medium text-[#cb7d87] mt-1">{eventTitle}</p>
          <p className="text-xs text-[#7c8764] mt-2">
            Registrado com carinho através do Photo Party
          </p>
        </footer>
      </main>
    </div>
  );
}
