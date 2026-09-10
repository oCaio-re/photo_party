import Link from "next/link";
import { MonogramLogo } from "@/components/MonogramLogo";
import { db, ensureSchema } from "@/db";
import { events } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Sparkles, Camera, ShieldCheck, Download, PlusCircle, ArrowRight } from "lucide-react";
import CreateEventForm from "./CreateEventForm";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensureSchema();
  const allEvents = await db.select().from(events).orderBy(desc(events.createdAt));
  const flagship = allEvents.find((e) => e.slug === "caio-e-sarah") || allEvents[0];

  return (
    <main className="flex-1 flex flex-col items-center justify-between p-4 sm:p-8 max-w-4xl mx-auto w-full">
      {/* Hero / Header */}
      <div className="w-full flex flex-col items-center text-center mt-6 mb-10">
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full bg-[#cb7d87] flex items-center justify-center shadow-[0_10px_25px_rgba(96,25,42,0.35)] before:absolute before:inset-1 before:rounded-full before:border-[2px] before:border-[#b86a76] before:opacity-60">
            <MonogramLogo size={52} color="#ffffff" />
          </div>
        </div>

        <span className="text-xs uppercase tracking-[0.25em] text-[#cb7d87] font-semibold">
          Plataforma de Fotografia ao Vivo
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl text-[#5a6248] mt-2 font-light">
          Photo Party
        </h1>
        <p className="text-sm text-[#7c8764] max-w-md mt-2 leading-relaxed">
          Compartilhe as melhores memórias pelo QR Code na sua mesa. Sem cadastros, instantâneo e colaborativo.
        </p>
      </div>

      {/* Flagship Showcase Card: Casamento de Caio & Sarah */}
      {flagship && (
        <div className="w-full bg-[#fffaf5] border border-[#cb7d87]/30 rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden mb-10">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#fbead6] rounded-full blur-2xl opacity-60 pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
            <div className="text-center sm:text-left">
              <span className="text-[11px] uppercase tracking-wider font-semibold bg-[#cb7d87]/15 text-[#832d3b] px-3 py-1 rounded-full">
                Evento em Destaque
              </span>
              <h2 className="font-serif text-3xl text-[#5a6248] mt-2 font-medium">
                {flagship.title}
              </h2>
              <p className="text-xs text-[#7c8764] mt-1">
                Galeria ao vivo e envio de fotos a partir das mesas com a identidade botânica do casal.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Link
                href={`/e/${flagship.slug}`}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#cb7d87] hover:bg-[#b86a76] text-white px-6 py-3 rounded-full font-serif text-lg tracking-wide shadow-sm transition-all duration-200 active:scale-95"
              >
                <Camera className="w-5 h-5 text-[#ebca90]" />
                <span>Entrar na Galeria</span>
              </Link>
              <Link
                href="/admin"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#fffaf5] hover:bg-[#fbead6] text-[#5a6248] border border-[#5a6248]/30 px-5 py-3 rounded-full text-xs font-semibold tracking-wider uppercase transition-all duration-200"
              >
                <span>Painel do Anfitrião</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-12">
        <div className="bg-[#fffaf5]/80 border border-[#cb7d87]/20 p-5 rounded-2xl text-center flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-[#cb7d87]/15 text-[#cb7d87] flex items-center justify-center mb-3">
            <Camera className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-lg text-[#5a6248]">Compressão Inteligente</h3>
          <p className="text-xs text-[#7c8764] mt-1">
            Fotos de 20MB são comprimidas no navegador em 0.8s, economizando dados mesmo em redes 4G instáveis.
          </p>
        </div>

        <div className="bg-[#fffaf5]/80 border border-[#cb7d87]/20 p-5 rounded-2xl text-center flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-[#5a6248]/15 text-[#5a6248] flex items-center justify-center mb-3">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-lg text-[#5a6248]">Moderação & Segurança</h3>
          <p className="text-xs text-[#7c8764] mt-1">
            Chave privada de Host, moderação de fotos e verificação rigorosa de arquivos e magic bytes.
          </p>
        </div>

        <div className="bg-[#fffaf5]/80 border border-[#cb7d87]/20 p-5 rounded-2xl text-center flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-[#ebca90]/40 text-[#832d3b] flex items-center justify-center mb-3">
            <Download className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-lg text-[#5a6248]">Exportação Photo Bundle</h3>
          <p className="text-xs text-[#7c8764] mt-1">
            Baixe com 1 clique todas as fotos em um único arquivo ZIP para salvar no seu Google Drive.
          </p>
        </div>
      </div>

      {/* Create New Event Section */}
      <div className="w-full bg-[#fffaf5] border border-[#cb7d87]/30 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="text-center mb-6">
          <span className="text-xs uppercase tracking-[0.2em] text-[#cb7d87] font-semibold">Novo Evento</span>
          <h2 className="font-serif text-3xl text-[#5a6248] mt-1 font-medium">Criar Celebração</h2>
          <p className="text-xs text-[#7c8764] mt-1 max-w-sm mx-auto">
            Crie um evento em segundos para gerar QR Codes para as mesas e receber as fotos dos seus convidados.
          </p>
        </div>

        <CreateEventForm />
      </div>

      {/* Footer */}
      <footer className="mt-14 mb-4 text-center text-xs text-[#7c8764]">
        <p>Inspirado no estilo botânico de <strong className="text-[#cb7d87]">Caio & Sarah</strong></p>
      </footer>
    </main>
  );
}
