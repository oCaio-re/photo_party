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
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">💬</span>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Moderação do Mural de Recados
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-xl">
            Acompanhe em tempo real o que os convidados estão enviando, envie anúncios oficiais que
            aparecem no Telão ou modere mensagens indesejadas.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="p-2 text-gray-500 hover:text-[#cb7d87] rounded-full hover:bg-rose-50 transition-colors cursor-pointer self-start sm:self-auto"
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
        className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
      >
        <div className="flex items-center gap-1.5 text-xs text-[#cb7d87] font-semibold whitespace-nowrap pl-1">
          <Shield className="w-3.5 h-3.5 text-[#cb7d87]" />
          <span>Aviso do Anfitrião:</span>
        </div>
        <input
          type="text"
          value={announcementText}
          onChange={(e) => setAnnouncementText(e.target.value)}
          placeholder="ex: Pista de dança aberta! Venham todos comemorar! 🎉"
          maxLength={300}
          className="flex-1 w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#cb7d87]"
        />
        <button
          type="submit"
          disabled={!announcementText.trim() || isSending}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-xs bg-[#cb7d87] hover:bg-[#b86a76] disabled:opacity-50 text-white px-4 py-2.5 rounded-xl shadow-xs font-semibold cursor-pointer transition-all"
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
        <div className="py-12 text-center text-gray-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#cb7d87]" />
          <p className="text-xs">Carregando recados...</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-12 px-4 bg-gray-50 rounded-3xl border border-gray-100">
          <p className="text-base font-semibold text-gray-700">Nenhum recado enviado</p>
          <p className="text-xs text-gray-400 mt-1">
            Os recados enviados pelos convidados aparecerão aqui para moderação.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-3xl p-4 divide-y divide-gray-100 shadow-xs">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="py-3 flex items-start justify-between gap-4 first:pt-1 last:pb-1"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="font-semibold text-gray-900">{msg.guestName}</span>
                  {msg.tableIdentifier && (
                    <span className="bg-gray-100 text-gray-700 text-[10px] px-2 py-0.5 rounded-full font-medium">
                      {msg.tableIdentifier}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-xs text-gray-700 mt-1 leading-relaxed break-words">
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
