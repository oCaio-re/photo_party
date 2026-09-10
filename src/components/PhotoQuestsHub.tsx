"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Camera, CheckCircle, RefreshCw, Eye } from "lucide-react";

export interface QuestItem {
  id: string;
  eventId: string;
  title: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  completedCount: number;
}

export function triggerQuestFulfill(quest: { id: string; title: string; icon?: string | null }) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("photo_party_fulfill_quest", {
        detail: { quest },
      })
    );
  }
}

interface PhotoQuestsHubProps {
  slug: string;
  onFulfillQuest?: (quest: QuestItem) => void;
  onFilterByQuest: (questTitle: string) => void;
}

export function PhotoQuestsHub({ slug, onFulfillQuest, onFilterByQuest }: PhotoQuestsHubProps) {
  const [quests, setQuests] = useState<QuestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchQuests = async () => {
    try {
      const res = await fetch(`/api/events/${slug}/quests`);
      if (res.ok) {
        const data = await res.json();
        setQuests(data.quests || []);
      }
    } catch (err) {
      console.error("Error loading quests:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuests();
  }, [slug]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchQuests();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const totalCompleted = quests.reduce((acc, q) => acc + (q.completedCount || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in bg-white">
      {/* Quests Header Card */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 text-center relative overflow-hidden shadow-sm">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-rose-50 mb-3 text-[#cb7d87]">
          <span className="text-3xl">🎯</span>
        </div>
        <h2 className="text-2xl sm:text-3xl text-gray-900 font-bold tracking-tight">
          Desafios Fotográficos
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-2 max-w-lg mx-auto leading-relaxed">
          Cumpra as missões especiais com o pessoal da sua mesa! Tire fotos espontâneas, criativas e divertidas para registrar cada detalhe da celebração.
        </p>

        {/* Global stats pills */}
        <div className="flex items-center justify-center gap-3 mt-4 pt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-900 text-white rounded-full text-xs font-medium shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{quests.length} Missões Disponíveis</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-[#cb7d87] rounded-full text-xs font-semibold border border-rose-100">
            <CheckCircle className="w-3.5 h-3.5 text-[#cb7d87]" />
            <span>{totalCompleted} Fotos Enviadas</span>
          </div>
          <button
            onClick={handleRefresh}
            className="p-1.5 text-gray-600 hover:text-[#cb7d87] bg-gray-50 rounded-full border border-gray-200 transition-transform active:rotate-180"
            title="Atualizar desafios"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Quests Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="bg-gray-50 border border-gray-100 rounded-2xl p-5 animate-pulse h-40"
            />
          ))}
        </div>
      ) : quests.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center max-w-md mx-auto">
          <p className="text-base font-semibold text-gray-900">Nenhum desafio ativo no momento.</p>
          <p className="text-xs text-gray-400 mt-1">O anfitrião pode adicionar desafios no Painel.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quests.map((quest) => (
            <div
              key={quest.id}
              className="bg-white border border-gray-100 hover:border-[#cb7d87]/40 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200 group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="w-11 h-11 rounded-2xl bg-rose-50 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    {quest.icon || "🎯"}
                  </div>
                  {quest.completedCount > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-800 bg-gray-100 px-2.5 py-0.5 rounded-full">
                      <span>✓ {quest.completedCount} foto{quest.completedCount > 1 ? "s" : ""}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wider text-[#cb7d87] font-semibold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                      Seja o primeiro!
                    </span>
                  )}
                </div>

                <h3 className="text-base text-gray-900 font-semibold leading-snug">
                  {quest.title}
                </h3>
                {quest.description && (
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                    {quest.description}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 mt-2 border-t border-gray-100 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onFulfillQuest) onFulfillQuest(quest);
                    triggerQuestFulfill(quest);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#cb7d87] hover:bg-[#b86a76] active:scale-95 text-white py-2.5 px-3 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-xs"
                >
                  <Camera className="w-3.5 h-3.5 text-white" />
                  <span>Cumprir Desafio</span>
                </button>

                {quest.completedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => onFilterByQuest(quest.title)}
                    className="p-2.5 bg-gray-50 hover:bg-gray-100 active:scale-95 text-gray-600 hover:text-[#cb7d87] rounded-xl border border-gray-200 transition-colors"
                    title="Ver fotos deste desafio"
                    aria-label="Ver fotos"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
