"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, Trash2, RefreshCw, Send, AlertCircle, Shield } from "lucide-react";
import { ChatMessageItem } from "@/components/EventChatView";

interface HostChatManagerProps {
  slug: string;
  hostKey: string;
}

export function HostChatManager({ slug, hostKey }: HostChatManagerProps) {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = async () => {
    try {
      setError(null);
      const res = await fetch(`/api/events/${slug}/chat`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      } else {
        throw new Error("Falha ao carregar recados");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [slug]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchMessages();
    setTimeout(() => setIsRefreshing(false), 300);
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = announcementText.trim();
    if (!text || isSending) return;

    try {
      setIsSending(true);
      setError(null);

      const res = await fetch(`/api/events/${slug}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${hostKey}`,
        },
        body: JSON.stringify({
          message: text,
          guestName: "Anfitrião 👑",
          tableIdentifier: "Aviso Oficial",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao enviar aviso");
      }

      setAnnouncementText("");
      setMessages((prev) => [...prev, data.message]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar aviso");
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm("Tem certeza que deseja apagar esta mensagem do mural?")) return;

    try {
      setDeletingId(messageId);
      const res = await fetch(
        `/api/events/${slug}/chat/${messageId}?key=${encodeURIComponent(hostKey)}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao apagar mensagem");
      }

      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao apagar mensagem");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#fffaf5] p-6 rounded-3xl border border-[#cb7d87]/20">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">💬</span>
            <h2 className="font-serif text-2xl text-[#5a6248] font-medium">
              Moderação do Mural de Recados
            </h2>
          </div>
          <p className="text-xs text-[#7c8764] mt-1 max-w-xl">
            Acompanhe em tempo real o que os convidados estão enviando, envie anúncios oficiais que
            aparecem no Telão ou modere mensagens indesejadas.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="p-2 text-[#5a6248] hover:text-[#cb7d87] rounded-full hover:bg-[#fbead6]/50 transition-colors cursor-pointer self-start sm:self-auto"
          title="Atualizar recados"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Broadcast Announcement Bar */}
      <form
        onSubmit={handleSendAnnouncement}
        className="bg-[#fffaf5] p-4 rounded-2xl border border-[#cb7d87]/30 flex flex-col sm:flex-row items-center gap-2 shadow-2xs"
      >
        <div className="flex items-center gap-1.5 text-xs text-[#832d3b] font-semibold whitespace-nowrap pl-1">
          <Shield className="w-3.5 h-3.5 text-[#cb7d87]" />
          <span>Aviso do Anfitrião:</span>
        </div>
        <input
          type="text"
          value={announcementText}
          onChange={(e) => setAnnouncementText(e.target.value)}
          placeholder="ex: Pista de dança aberta! Venham todos comemorar! 🎉"
          maxLength={300}
          className="flex-1 w-full px-3.5 py-2 rounded-xl border border-[#cb7d87]/30 bg-white text-xs text-[#5a6248] focus:outline-hidden focus:ring-2 focus:ring-[#cb7d87]"
        />
        <button
          type="submit"
          disabled={!announcementText.trim() || isSending}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-xs bg-[#cb7d87] hover:bg-[#b86a76] disabled:opacity-50 text-white px-4 py-2 rounded-xl shadow-xs font-medium cursor-pointer transition-all"
        >
          {isSending ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span>Publicar no Telão</span>
        </button>
      </form>

      {/* Messages List */}
      {isLoading ? (
        <div className="py-12 text-center text-[#7c8764]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#cb7d87]" />
          <p className="text-xs">Carregando recados...</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-12 px-4 bg-[#fffaf5] rounded-3xl border border-[#cb7d87]/20">
          <p className="font-serif text-xl text-[#5a6248]">Nenhum recado enviado</p>
          <p className="text-xs text-[#7c8764] mt-1">
            Os recados enviados pelos convidados aparecerão aqui para moderação.
          </p>
        </div>
      ) : (
        <div className="bg-[#fffaf5] border border-[#cb7d87]/20 rounded-3xl p-4 divide-y divide-[#cb7d87]/15">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="py-3 flex items-start justify-between gap-4 first:pt-1 last:pb-1"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="font-semibold text-[#5a6248]">{msg.guestName}</span>
                  {msg.tableIdentifier && (
                    <span className="bg-[#5a6248]/15 text-[#5a6248] text-[10px] px-2 py-0.2 rounded-full font-medium">
                      {msg.tableIdentifier}
                    </span>
                  )}
                  <span className="text-[10px] text-[#7c8764]">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-xs text-[#3f4633] mt-1 leading-relaxed break-words">
                  {msg.message}
                </p>
              </div>

              <button
                onClick={() => handleDeleteMessage(msg.id)}
                disabled={deletingId === msg.id}
                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                title="Apagar recado"
              >
                {deletingId === msg.id ? (
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
