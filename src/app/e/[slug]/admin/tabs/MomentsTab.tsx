"use client";

import React, { useState } from "react";
import { CheckCircle, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { WeddingMomentConfig, DEFAULT_WEDDING_MOMENTS } from "@/lib/moments";

interface MomentsTabProps {
  slug: string;
  hostKey: string;
  initialMoments: WeddingMomentConfig[];
}

export function MomentsTab({ slug, hostKey, initialMoments }: MomentsTabProps) {
  const [moments, setMoments] = useState<WeddingMomentConfig[]>(
    initialMoments.length > 0 ? initialMoments : DEFAULT_WEDDING_MOMENTS
  );
  const [isSavingMoments, setIsSavingMoments] = useState(false);
  const [momentsMessage, setMomentsMessage] = useState<string | null>(null);

  // Save moments schedule
  const handleSaveMoments = async () => {
    try {
      setIsSavingMoments(true);
      setMomentsMessage(null);
      const res = await fetch(`/api/events/${slug}/settings?key=${hostKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ momentsConfig: moments }),
      });
      if (res.ok) {
        setMomentsMessage("Cronograma de momentos atualizado com sucesso!");
        setTimeout(() => setMomentsMessage(null), 3500);
      } else {
        setMomentsMessage("Erro ao atualizar cronograma de momentos.");
      }
    } catch (err) {
      console.error("Error saving moments schedule:", err);
      setMomentsMessage("Falha na conexão ao salvar horários.");
    } finally {
      setIsSavingMoments(false);
    }
  };

  // Add a new moment stage
  const handleAddMoment = () => {
    const lastMoment = moments[moments.length - 1];
    let nextStart = "18:00";
    let nextEnd = "20:00";

    if (lastMoment?.endTime) {
      nextStart = lastMoment.endTime;
      const [h, m] = nextStart.split(":").map(Number);
      const nextH = (h + 2) % 24;
      nextEnd = `${String(nextH).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
    }

    const uniqueId = `momento_${Date.now().toString(36)}`;

    const newMoment: WeddingMomentConfig = {
      id: uniqueId,
      name: `Nova Etapa ${moments.length + 1}`,
      icon: "✨",
      startTime: nextStart,
      endTime: nextEnd,
      fallbackImage:
        "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80",
      description: "",
    };

    setMoments((prev) => [...prev, newMoment]);
    setMomentsMessage("Nova etapa adicionada ao cronograma. Personalize os campos e clique em 'Salvar Cronograma'.");
    setTimeout(() => setMomentsMessage(null), 4000);
  };

  // Remove a moment stage
  const handleRemoveMoment = (indexToRemove: number) => {
    if (moments.length <= 1) {
      alert("O cronograma deve conter pelo menos uma etapa.");
      return;
    }
    const momentToRemove = moments[indexToRemove];
    if (confirm(`Deseja remover a etapa "${momentToRemove.name || "Sem nome"}" do cronograma?`)) {
      setMoments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
      setMomentsMessage("Etapa removida. Clique em 'Salvar Cronograma' para confirmar as alterações.");
      setTimeout(() => setMomentsMessage(null), 3500);
    }
  };

  // Move moment up or down
  const handleMoveMoment = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === moments.length - 1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    setMoments((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-4 sm:p-6 md:p-8 max-w-2xl mx-auto shadow-sm space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold bg-rose-50 text-marsala-ink border border-[#cb7d87]/20 px-2.5 py-0.5 rounded-full">
              Horários do Evento
            </span>
            <span className="text-xs text-gray-500 font-medium">
              {moments.length} {moments.length === 1 ? "etapa" : "etapas"}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 mt-1">
            Cronograma de Momentos
          </h3>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Adicione, remova ou reordene as etapas do casamento. O aplicativo detecta o horário em tempo real no dia da festa para pré-selecionar o momento no envio de fotos e organizar as recordações na galeria.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddMoment}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-marsala-ink hover:bg-marsala-ink-hover text-white px-4 py-2.5 rounded-xl font-semibold text-xs shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova Etapa</span>
        </button>
      </div>

      {momentsMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium animate-fade-in">
          {momentsMessage}
        </div>
      )}

      <div className="space-y-3.5">
        {moments.map((moment, idx) => (
          <div
            key={moment.id}
            className="bg-gray-50/70 border border-gray-100 rounded-2xl p-3.5 sm:p-4 hover:border-[#cb7d87]/30 transition-colors"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 mb-2.5">
              <div className="flex items-center gap-2 w-full sm:w-auto flex-1 min-w-0">
                {/* Position badge & reorder buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[11px] font-bold text-gray-500 bg-white px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg border border-gray-200 shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => handleMoveMoment(idx, "up")}
                      disabled={idx === 0}
                      className="p-0.5 text-gray-500 hover:text-marsala-ink disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                      title="Mover para cima"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveMoment(idx, "down")}
                      disabled={idx === moments.length - 1}
                      className="p-0.5 text-gray-500 hover:text-marsala-ink disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                      title="Mover para baixo"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  value={moment.icon}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMoments((prev) =>
                      prev.map((m, i) => (i === idx ? { ...m, icon: val } : m))
                    );
                  }}
                  className="w-9 h-9 sm:w-10 sm:h-10 text-center text-lg sm:text-xl bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-marsala-ink shrink-0"
                  title="Emoji da etapa"
                />

                <input
                  type="text"
                  value={moment.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMoments((prev) =>
                      prev.map((m, i) => (i === idx ? { ...m, name: val } : m))
                    );
                  }}
                  className="text-xs sm:text-sm font-bold text-gray-900 border-b border-dashed border-gray-300 focus:border-[#cb7d87] focus:outline-none px-1 py-0.5 min-w-0 flex-1"
                  placeholder="Nome da etapa"
                />
              </div>

              <div className="flex items-center gap-2 text-xs w-full sm:w-auto justify-between sm:justify-end shrink-0">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-gray-500 font-medium">De:</span>
                  <input
                    type="time"
                    value={moment.startTime}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMoments((prev) =>
                        prev.map((m, i) => (i === idx ? { ...m, startTime: val } : m))
                      );
                    }}
                    className="w-20 sm:w-24 px-1.5 sm:px-2 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-marsala-ink"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-gray-500 font-medium">Até:</span>
                  <input
                    type="time"
                    value={moment.endTime}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMoments((prev) =>
                        prev.map((m, i) => (i === idx ? { ...m, endTime: val } : m))
                      );
                    }}
                    className="w-20 sm:w-24 px-1.5 sm:px-2 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-marsala-ink"
                  />
                </div>

                {/* Delete stage button */}
                <button
                  type="button"
                  onClick={() => handleRemoveMoment(idx)}
                  disabled={moments.length <= 1}
                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed shrink-0"
                  title={moments.length <= 1 ? "Deve haver pelo menos uma etapa" : "Remover esta etapa"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <input
              type="text"
              value={moment.description || ""}
              onChange={(e) => {
                const val = e.target.value;
                setMoments((prev) =>
                  prev.map((m, i) => (i === idx ? { ...m, description: val } : m))
                );
              }}
              placeholder="Descrição breve ou orientação para os convidados..."
              className="w-full text-xs text-gray-600 bg-white border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-marsala-ink"
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={() => {
            if (confirm("Deseja restaurar o cronograma para os 6 momentos originais padrão?")) {
              setMoments(DEFAULT_WEDDING_MOMENTS);
              setMomentsMessage("Horários restaurados para o padrão. Clique em 'Salvar Cronograma' para confirmar.");
            }
          }}
          className="text-xs text-gray-500 hover:text-gray-700 underline cursor-pointer text-center sm:text-left"
        >
          Restaurar Padrão Original
        </button>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleAddMoment}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-rose-50 text-gray-700 hover:text-marsala-ink px-3.5 sm:px-4 py-2.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Etapa</span>
          </button>

          <button
            type="button"
            disabled={isSavingMoments}
            onClick={handleSaveMoments}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-marsala-ink hover:bg-marsala-ink-hover active:scale-95 disabled:opacity-50 text-white px-5 sm:px-6 py-2.5 rounded-xl font-semibold text-xs shadow-md shadow-[#cb7d87]/25 transition-all cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{isSavingMoments ? "Salvando..." : "Salvar Cronograma"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
