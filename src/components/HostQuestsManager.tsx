"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Plus, Trash2, RefreshCw, AlertCircle, Check } from "lucide-react";
import { QuestItem } from "@/components/PhotoQuestsHub";

interface HostQuestsManagerProps {
  slug: string;
  hostKey: string;
}

const EMOJI_SUGGESTIONS = ["🥂", "💍", "💃", "📸", "🍰", "💐", "🕶️", "❤️", "🎩", "🎉"];

export function HostQuestsManager({ slug, hostKey }: HostQuestsManagerProps) {
  const [quests, setQuests] = useState<QuestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New quest form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🎯");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchQuests = async () => {
    try {
      setError(null);
      const res = await fetch(`/api/events/${slug}/quests`);
      if (res.ok) {
        const data = await res.json();
        setQuests(data.quests || []);
      } else {
        throw new Error("Falha ao carregar desafios");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
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

  const handleCreateQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const res = await fetch(`/api/events/${slug}/quests?key=${encodeURIComponent(hostKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          icon: icon.trim() || "🎯",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao criar desafio");
      }

      // Add to list and reset
      setQuests((prev) => [...prev, { ...data.quest, completedCount: 0 }]);
      setTitle("");
      setDescription("");
      setIcon("🎯");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar desafio");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteQuest = async (questId: string) => {
    if (!confirm("Tem certeza que deseja remover este desafio?")) return;

    try {
      setDeletingId(questId);
      const res = await fetch(
        `/api/events/${slug}/quests/${questId}?key=${encodeURIComponent(hostKey)}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao remover desafio");
      }

      setQuests((prev) => prev.filter((q) => q.id !== questId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao remover desafio");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#fffaf5] p-6 rounded-3xl border border-[#cb7d87]/20">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <h2 className="font-serif text-2xl text-[#5a6248] font-medium">
              Desafios de Fotos dos Convidados
            </h2>
          </div>
          <p className="text-xs text-[#7c8764] mt-1 max-w-xl">
            Incentive momentos divertidos e espontâneos. Os convidados podem ver os desafios na aba
            dedicada e cumpri-los enviando fotos diretamente!
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleRefresh}
            className="p-2 text-[#5a6248] hover:text-[#cb7d87] rounded-full hover:bg-[#fbead6]/50 transition-colors cursor-pointer"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 text-xs bg-[#cb7d87] hover:bg-[#b86a76] text-white px-4 py-2 rounded-full shadow-xs cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{showForm ? "Fechar Formulário" : "Novo Desafio"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* New Quest Form */}
      {showForm && (
        <form
          onSubmit={handleCreateQuest}
          className="bg-[#fffaf5] p-6 rounded-3xl border border-[#cb7d87]/30 shadow-xs space-y-4"
        >
          <h3 className="font-serif text-lg text-[#5a6248]">Criar Novo Desafio</h3>

          <div>
            <label className="block text-xs font-semibold text-[#5a6248] mb-1">
              Ícone / Emoji
            </label>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {EMOJI_SUGGESTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setIcon(item)}
                  className={`w-9 h-9 text-lg rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    icon === item
                      ? "bg-[#cb7d87] text-white scale-110 shadow-xs"
                      : "bg-[#fffaf5] border border-[#cb7d87]/20 hover:bg-[#fbead6]/50"
                  }`}
                >
                  {item}
                </button>
              ))}
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                maxLength={4}
                className="w-14 text-center px-2 py-1.5 text-base rounded-xl border border-[#cb7d87]/30 bg-white focus:outline-hidden focus:ring-1 focus:ring-[#cb7d87]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5a6248] mb-1">
              Título do Desafio *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: Brinde com os noivos"
              className="w-full px-4 py-2.5 rounded-2xl border border-[#cb7d87]/30 bg-white text-xs text-[#5a6248] placeholder-[#7c8764]/60 focus:outline-hidden focus:ring-2 focus:ring-[#cb7d87]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5a6248] mb-1">
              Dica / Descrição (opcional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ex: Capture aquele momento especial de comemoração"
              className="w-full px-4 py-2.5 rounded-2xl border border-[#cb7d87]/30 bg-white text-xs text-[#5a6248] placeholder-[#7c8764]/60 focus:outline-hidden focus:ring-2 focus:ring-[#cb7d87]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs text-[#5a6248] hover:bg-[#fbead6]/50 rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="flex items-center gap-1.5 text-xs bg-[#5a6248] hover:bg-[#49503a] disabled:opacity-50 text-[#fbead6] px-5 py-2 rounded-xl shadow-xs cursor-pointer font-medium"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Adicionar Desafio</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Quests List */}
      {isLoading ? (
        <div className="py-12 text-center text-[#7c8764]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#cb7d87]" />
          <p className="text-xs">Carregando desafios...</p>
        </div>
      ) : quests.length === 0 ? (
        <div className="text-center py-12 px-4 bg-[#fffaf5] rounded-3xl border border-[#cb7d87]/20">
          <p className="font-serif text-xl text-[#5a6248]">Nenhum desafio ativo</p>
          <p className="text-xs text-[#7c8764] mt-1">
            Clique no botão acima para criar o primeiro desafio fotográfico!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quests.map((quest) => (
            <div
              key={quest.id}
              className="bg-[#fffaf5] border border-[#cb7d87]/20 rounded-2xl p-4.5 flex items-start justify-between gap-3 shadow-xs hover:border-[#cb7d87]/40 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#fbead6] border border-[#cb7d87]/20 flex items-center justify-center text-xl shrink-0">
                  {quest.icon || "🎯"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm text-[#5a6248]">{quest.title}</h4>
                  </div>
                  {quest.description && (
                    <p className="text-xs text-[#7c8764] mt-0.5 leading-relaxed">
                      {quest.description}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold bg-[#cb7d87]/15 text-[#832d3b] px-2 py-0.5 rounded-full">
                      {quest.completedCount} {quest.completedCount === 1 ? "foto" : "fotos"} enviadas
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDeleteQuest(quest.id)}
                disabled={deletingId === quest.id}
                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                title="Excluir desafio"
              >
                {deletingId === quest.id ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
