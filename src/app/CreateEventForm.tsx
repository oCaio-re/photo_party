"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, CheckCircle2, Copy, ExternalLink, ArrowRight } from "lucide-react";

export default function CreateEventForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [moderationPolicy, setModerationPolicy] = useState<"immediate" | "approval_required">("immediate");
  const [uploadHours, setUploadHours] = useState<number | "">(48);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdEvent, setCreatedEvent] = useState<{
    slug: string;
    publicUrl: string;
    adminUrl: string;
    hostKey: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          moderationPolicy,
          uploadHours: uploadHours ? Number(uploadHours) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar evento");

      setCreatedEvent({
        slug: data.event.slug,
        publicUrl: data.publicUrl,
        adminUrl: data.adminUrl,
        hostKey: data.event.hostKey,
      });
    } catch (err: any) {
      alert(err.message || "Falha ao criar evento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  if (createdEvent) {
    return (
      <div className="bg-[#fbead6]/60 border border-[#cb7d87]/40 rounded-2xl p-6 text-[#49503b] space-y-5 animate-fade-in">
        <div className="flex items-center gap-2 text-emerald-800">
          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          <h3 className="font-serif text-2xl text-[#5a6248]">Evento Criado com Sucesso!</h3>
        </div>

        <p className="text-xs text-[#7c8764]">
          Guarde o seu <strong>Link Secreto de Gestão</strong>. Ele contém a sua <strong>Host Key</strong> que dá controle total do evento sem precisar de cadastros ou senhas.
        </p>

        <div className="space-y-3 bg-white p-4 rounded-xl border border-[#cb7d87]/20">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#cb7d87] block mb-1">
              Link Secreto de Gestão (Painel do Anfitrião)
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${typeof window !== "undefined" ? window.location.origin : ""}${createdEvent.adminUrl}`}
                className="w-full text-xs font-mono bg-gray-50 p-2 rounded-lg border border-gray-200 text-gray-700"
              />
              <button
                onClick={() =>
                  copyToClipboard(`${window.location.origin}${createdEvent.adminUrl}`)
                }
                className="px-3 py-2 bg-[#cb7d87] hover:bg-[#b86a76] text-white rounded-lg text-xs flex items-center gap-1 shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedKey ? "Copiado!" : "Copiar"}</span>
              </button>
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#5a6248] block mb-1">
              Link Público para Convidados
            </span>
            <input
              type="text"
              readOnly
              value={`${typeof window !== "undefined" ? window.location.origin : ""}${createdEvent.publicUrl}`}
              className="w-full text-xs font-mono bg-gray-50 p-2 rounded-lg border border-gray-200 text-gray-700"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => router.push(createdEvent.adminUrl)}
            className="flex-1 bg-[#cb7d87] hover:bg-[#b86a76] text-white py-3 rounded-xl font-serif text-base flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Ir para o Painel do Anfitrião</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => router.push(createdEvent.publicUrl)}
            className="flex-1 bg-white hover:bg-gray-50 text-[#5a6248] border border-[#5a6248]/30 py-3 rounded-xl font-serif text-base flex items-center justify-center gap-2"
          >
            <span>Ver Galeria Pública</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">
      <div>
        <label className="block text-xs font-semibold text-[#5a6248] mb-1 uppercase tracking-wider">
          Título ou Nome da Celebração
        </label>
        <input
          type="text"
          required
          placeholder="Ex: Aniversário da Sofia ou Casamento de Rita & Tiago"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-[#cb7d87]/30 bg-white focus:outline-none focus:border-[#cb7d87] text-sm text-[#49503b]"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#5a6248] mb-1 uppercase tracking-wider">
            Moderação de Fotos
          </label>
          <select
            value={moderationPolicy}
            onChange={(e) => setModerationPolicy(e.target.value as any)}
            className="w-full px-3 py-2.5 rounded-xl border border-[#cb7d87]/30 bg-white focus:outline-none focus:border-[#cb7d87] text-xs text-[#49503b]"
          >
            <option value="immediate">Publicação Imediata (Recomendado)</option>
            <option value="approval_required">Aprovação Prévia do Host</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#5a6248] mb-1 uppercase tracking-wider">
            Janela de Upload (Horas)
          </label>
          <input
            type="number"
            min="1"
            max="168"
            value={uploadHours}
            onChange={(e) => setUploadHours(e.target.value ? Number(e.target.value) : "")}
            placeholder="Ex: 48 horas"
            className="w-full px-3 py-2.5 rounded-xl border border-[#cb7d87]/30 bg-white focus:outline-none focus:border-[#cb7d87] text-xs text-[#49503b]"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !title.trim()}
        className="w-full bg-[#cb7d87] hover:bg-[#b86a76] disabled:opacity-50 text-white py-3.5 rounded-xl font-serif text-lg tracking-wide shadow-sm transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
      >
        <PlusCircle className="w-5 h-5 text-[#ebca90]" />
        <span>{isSubmitting ? "Criando evento..." : "Criar Evento e Gerar QR Codes"}</span>
      </button>
    </form>
  );
}
