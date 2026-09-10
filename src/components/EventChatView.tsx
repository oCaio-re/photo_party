"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Send, Trash2, RefreshCw, MessageSquare, Sparkles, User, AlertCircle } from "lucide-react";

export interface ChatMessageItem {
  id: string;
  eventId: string;
  guestSessionId: string;
  guestName: string;
  tableIdentifier: string | null;
  message: string;
  createdAt: string | number | Date;
}

interface EventChatViewProps {
  slug: string;
  guestSessionId?: string;
  guestName?: string;
  onChangeName?: () => void;
}

const CHEER_PROMPTS = [
  "🥂 Um brinde aos noivos!",
  "💃 Quem vai pra pista comigo?",
  "💍 Que momento inesquecível!",
  "❤️ Muito amor para o casal!",
  "🎉 Essa festa está espetacular!",
];

function formatTime(dateInput: string | number | Date): string {
  const date = new Date(dateInput);
  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 60) return "agora";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;
  return `${Math.floor(diffInHours / 24)}d`;
}

export function EventChatView({
  slug,
  guestSessionId: initialSessionId,
  guestName: initialName,
  onChangeName,
}: EventChatViewProps) {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [guestSessionId, setGuestSessionId] = useState(initialSessionId || "");
  const [guestName, setGuestName] = useState(initialName || "");
  const [tableIdentifier, setTableIdentifier] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef<boolean>(true);

  // Load identity from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      let sId = localStorage.getItem("photo_party_guest_id");
      if (!sId) {
        sId = crypto.randomUUID();
        localStorage.setItem("photo_party_guest_id", sId);
      }
      setGuestSessionId(sId);

      const savedName = localStorage.getItem("photo_party_guest_name") || "";
      if (savedName) setGuestName(savedName);

      const savedTable = localStorage.getItem("photo_party_table_id") || "";
      if (savedTable) setTableIdentifier(savedTable);
    }
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${slug}/chat`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.warn("Error loading chat messages:", err);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  // Initial fetch and polling every 4 seconds
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Auto-scroll on initial load or new messages
  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      scrollToBottom(false);
    }
  }, [messages, scrollToBottom]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchMessages();
    setTimeout(() => {
      setIsRefreshing(false);
      scrollToBottom(true);
    }, 300);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    try {
      setIsSending(true);
      setError(null);

      const sId = guestSessionId || localStorage.getItem("photo_party_guest_id") || "";
      const currentName = guestName || localStorage.getItem("photo_party_guest_name") || "Convidado";
      const currentTable = tableIdentifier || localStorage.getItem("photo_party_table_id") || null;

      const res = await fetch(`/api/events/${slug}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-guest-session-id": sId,
        },
        body: JSON.stringify({
          message: text,
          guestName: currentName,
          tableIdentifier: currentTable,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao enviar mensagem");
      }

      setInputText("");
      shouldAutoScrollRef.current = true;
      setMessages((prev) => [...prev, data.message]);
      setTimeout(() => scrollToBottom(true), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar mensagem");
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const sId = guestSessionId || localStorage.getItem("photo_party_guest_id") || "";
      const res = await fetch(`/api/events/${slug}/chat/${messageId}`, {
        method: "DELETE",
        headers: {
          "x-guest-session-id": sId,
        },
      });

      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col h-[76vh] sm:h-[80vh] bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
      {/* Header Bar */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-[#cb7d87]">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base text-gray-900 font-bold leading-none">
              Mural de Recados
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Ao vivo no Telão e para todos os convidados
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onChangeName && (
            <button
              onClick={onChangeName}
              className="flex items-center gap-1 text-[11px] text-gray-600 hover:text-[#cb7d87] bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
              title="Alterar seu nome"
            >
              <User className="w-3 h-3 text-[#cb7d87]" />
              <span className="truncate max-w-[100px]">{guestName || "Anônimo"}</span>
            </button>
          )}
          <button
            onClick={handleManualRefresh}
            className="p-1.5 text-gray-500 hover:text-[#cb7d87] rounded-full transition-colors cursor-pointer"
            title="Atualizar mensagens"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Cheer Prompts Carousel */}
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
        <span className="text-[11px] font-semibold text-[#cb7d87] whitespace-nowrap pl-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#cb7d87]" />
          Envio rápido:
        </span>
        {CHEER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => handleSendMessage(prompt)}
            disabled={isSending}
            className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-700 hover:bg-rose-50 hover:text-[#cb7d87] transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Feed */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-white"
      >
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-[#cb7d87]" />
            <span className="text-xs">Carregando recados...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-[#cb7d87] mb-2">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-gray-900">Nenhum recado ainda</h4>
            <p className="text-xs text-gray-400 mt-1 max-w-xs">
              Seja o primeiro a deixar uma mensagem de carinho ou um brinde para os noivos!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.guestSessionId === guestSessionId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col group ${isMe ? "items-end" : "items-start"}`}
              >
                {/* Author info */}
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px]">
                  <span
                    className={`font-semibold ${
                      isMe ? "text-[#cb7d87]" : "text-gray-900"
                    }`}
                  >
                    {isMe ? "Você" : msg.guestName}
                  </span>
                  {msg.tableIdentifier && (
                    <span className="bg-gray-100 text-gray-700 text-[9px] px-1.5 py-0.2 rounded-full font-medium">
                      {msg.tableIdentifier}
                    </span>
                  )}
                  <span className="text-gray-400 text-[10px]">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>

                {/* Message Bubble */}
                <div className="relative flex items-center gap-2 max-w-[85%] sm:max-w-[75%]">
                  {isMe && (
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-rose-600 rounded-full hover:bg-rose-50 cursor-pointer"
                      title="Apagar minha mensagem"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div
                    className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs break-words ${
                      isMe
                        ? "bg-[#cb7d87] text-white rounded-tr-xs"
                        : "bg-gray-50 text-gray-900 border border-gray-100 rounded-tl-xs"
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-red-700 text-[11px] flex items-center gap-2 shrink-0">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Input Area */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 bg-white border-t border-gray-100 flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            guestName ? `Escreva um recado, ${guestName}...` : "Escreva um recado para a festa..."
          }
          maxLength={500}
          className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-[#cb7d87] focus:bg-white"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="w-10 h-10 rounded-full bg-[#cb7d87] hover:bg-[#b86a76] disabled:opacity-40 text-white flex items-center justify-center shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
          title="Enviar recado"
        >
          {isSending ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  );
}
