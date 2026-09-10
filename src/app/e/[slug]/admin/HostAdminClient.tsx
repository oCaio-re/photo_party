"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Key,
  Camera,
  CheckCircle,
  EyeOff,
  Trash2,
  Download,
  QrCode,
  Settings,
  Clock,
  Copy,
  ExternalLink,
  Plus,
  Tv,
  Heart,
  MessageSquare,
  Sparkles,
  BookOpen,
  LogOut,
  Loader2,
  ShieldCheck,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { MonogramLogo } from "@/components/MonogramLogo";
import { TableCardsPrinter, TableItem } from "@/components/TableCardsPrinter";
import { PhotoItem } from "@/components/LiveGalleryView";
import { HostQuestsManager } from "@/components/HostQuestsManager";
import { HostChatManager } from "@/components/HostChatManager";
import { WeddingMomentConfig, DEFAULT_WEDDING_MOMENTS } from "@/lib/moments";

interface HostAdminClientProps {
  event: {
    id: string;
    slug: string;
    title: string;
    hostKey: string;
    moderationPolicy: string;
    uploadDeadline: string | null;
    isUploadClosed: boolean;
  };
  initialTables: TableItem[];
  initialPhotos: PhotoItem[];
  initialMoments?: WeddingMomentConfig[];
  initialAuthorized: boolean;
  providedKey: string;
  loggedUser?: string;
}

export function HostAdminClient({
  event: initialEvent,
  initialTables,
  initialPhotos,
  initialMoments = DEFAULT_WEDDING_MOMENTS,
  initialAuthorized,
  providedKey,
  loggedUser,
}: HostAdminClientProps) {
  const [event, setEvent] = useState(initialEvent);
  const [photos, setPhotos] = useState<PhotoItem[]>(initialPhotos);
  const [tables, setTables] = useState<TableItem[]>(initialTables);
  const [moments, setMoments] = useState<WeddingMomentConfig[]>(
    initialMoments && initialMoments.length > 0 ? initialMoments : DEFAULT_WEDDING_MOMENTS
  );
  const [isSavingMoments, setIsSavingMoments] = useState(false);
  const [momentsMessage, setMomentsMessage] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState(providedKey);
  const [isAuthorized, setIsAuthorized] = useState(initialAuthorized);
  const [authError, setAuthError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [activeTab, setActiveTab] = useState<
    "photos" | "tables" | "quests" | "chat" | "moments" | "bundle" | "settings"
  >("photos");
  const [photoFilter, setPhotoFilter] = useState<"all" | "pending" | "approved" | "hidden">("all");

  const [newTableCount, setNewTableCount] = useState<number>(5);
  const [isGeneratingTables, setIsGeneratingTables] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Photo delete confirmation state
  const [photoToDelete, setPhotoToDelete] = useState<PhotoItem | null>(null);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);

  // Logout handler
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await fetch("/api/admin/logout", { method: "POST" });
      window.location.href = "/admin";
    } catch {
      window.location.href = "/admin";
    }
  };

  // Authorization check (fallback if key needed)
  const handleAuthorize = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyInput.trim() === event.hostKey) {
      setIsAuthorized(true);
      setAuthError("");
      const newUrl = `${window.location.pathname}?key=${keyInput.trim()}`;
      window.history.replaceState(null, "", newUrl);
    } else {
      setAuthError("Chave de Host incorreta. Verifique a chave fornecida.");
    }
  };

  // Moderate photo
  const handlePhotoStatus = async (photoId: string, newStatus: "approved" | "hidden") => {
    try {
      const res = await fetch(`/api/events/${event.slug}/photos/${photoId}?key=${event.hostKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setPhotos((prev) =>
          prev.map((p) => (p.id === photoId ? { ...p, status: newStatus } : p))
        );
      }
    } catch (err) {
      console.error("Error updating photo status:", err);
    }
  };

  // Confirm and delete photo
  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    try {
      setIsDeletingPhoto(true);
      const res = await fetch(
        `/api/events/${event.slug}/photos/${photoToDelete.id}?key=${event.hostKey}`,
        {
          method: "DELETE",
        }
      );
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoToDelete.id));
        setPhotoToDelete(null);
      }
    } catch (err) {
      console.error("Error deleting photo:", err);
    } finally {
      setIsDeletingPhoto(false);
    }
  };

  // Generate batch tables
  const handleGenerateTables = async () => {
    try {
      setIsGeneratingTables(true);
      const res = await fetch(`/api/events/${event.slug}/tables?key=${event.hostKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: newTableCount }),
      });
      const data = await res.json();
      if (res.ok && data.created) {
        setTables((prev) => [...prev, ...data.created]);
      }
    } catch (err) {
      console.error("Error generating tables:", err);
    } finally {
      setIsGeneratingTables(false);
    }
  };

  // Save moments schedule
  const handleSaveMoments = async () => {
    try {
      setIsSavingMoments(true);
      setMomentsMessage(null);
      const res = await fetch(`/api/events/${event.slug}/settings?key=${event.hostKey}`, {
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

  // Toggle uploads
  const handleToggleUploads = async (closed: boolean) => {
    try {
      const res = await fetch(`/api/events/${event.slug}/settings?key=${event.hostKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isUploadClosed: closed }),
      });
      if (res.ok) {
        setEvent((prev) => ({ ...prev, isUploadClosed: closed }));
      }
    } catch (err) {
      console.error("Error toggling uploads:", err);
    }
  };

  // Change moderation policy
  const handleChangePolicy = async (policy: "immediate" | "approval_required") => {
    try {
      const res = await fetch(`/api/events/${event.slug}/settings?key=${event.hostKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moderationPolicy: policy }),
      });
      if (res.ok) {
        setEvent((prev) => ({ ...prev, moderationPolicy: policy }));
      }
    } catch (err) {
      console.error("Error updating policy:", err);
    }
  };

  // Copy management link
  const copyAdminLink = () => {
    const fullUrl = `${window.location.origin}/admin`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Fallback unlock prompt if someone accesses direct route without session
  if (!isAuthorized) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="bg-white border border-gray-100 rounded-3xl p-8 max-w-md w-full shadow-xl text-center">
          <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-[#cb7d87] mx-auto mb-4 ring-4 ring-[#cb7d87]/15">
            <Key className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Acesso de Anfitrião</h2>
          <p className="text-xs text-gray-500 mt-1 mb-6">
            Introduza a sua <strong>Host Key</strong> para desbloquear a administração.
          </p>

          <form onSubmit={handleAuthorize} className="space-y-4">
            <input
              type="text"
              required
              placeholder="Introduza a sua Host Key (ex: amor2026)"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#cb7d87] text-center font-mono text-sm text-gray-900"
            />

            {authError && (
              <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl">{authError}</p>
            )}

            <button
              type="submit"
              className="w-full bg-[#cb7d87] hover:bg-[#b86a76] text-white py-3 rounded-2xl font-semibold text-sm shadow-md shadow-[#cb7d87]/25 cursor-pointer transition-all"
            >
              Desbloquear Painel
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center gap-4 text-xs">
            <Link href="/admin" className="text-[#cb7d87] font-semibold hover:underline">
              Fazer Login Normal
            </Link>
            <span className="text-gray-300">•</span>
            <Link href={`/e/${event.slug}`} className="text-gray-500 hover:text-gray-700">
              Galeria Pública
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Filtered photos count
  const pendingCount = photos.filter((p) => p.status === "pending").length;
  const approvedCount = photos.filter((p) => p.status === "approved").length;
  const hiddenCount = photos.filter((p) => p.status === "hidden").length;

  const displayedPhotos =
    photoFilter === "all" ? photos : photos.filter((p) => p.status === photoFilter);

  return (
    <div className="pt-6">
      {/* Top Navbar / Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#cb7d87] flex items-center justify-center shadow-md shadow-[#cb7d87]/20 shrink-0 ring-2 ring-[#cb7d87]/15">
            <MonogramLogo size={26} color="#ffffff" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-rose-50 text-[#cb7d87] border border-[#cb7d87]/20 px-2.5 py-0.5 rounded-full shrink-0">
                <Sparkles className="w-3 h-3 text-[#cb7d87]" />
                <span>Olá, {loggedUser || "Noivos"} ✨</span>
              </span>
              <span
                className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${
                  event.isUploadClosed
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                {event.isUploadClosed ? "Uploads Fechados" : "Uploads Abertos"}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-gray-900 mt-0.5 truncate">
              {event.title}
            </h1>
          </div>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar py-1">
          <Link
            href={`/e/${event.slug}`}
            target="_blank"
            className="shrink-0 flex items-center justify-center gap-1.5 text-xs text-gray-700 hover:text-[#cb7d87] bg-gray-50 hover:bg-rose-50/50 px-3 py-2 rounded-xl border border-gray-200 transition-colors whitespace-nowrap"
          >
            <span>Ver Galeria</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <Link
            href={`/e/${event.slug}/slideshow`}
            target="_blank"
            className="shrink-0 flex items-center justify-center gap-1.5 text-xs text-gray-700 hover:text-[#cb7d87] bg-gray-50 hover:bg-rose-50/50 px-3 py-2 rounded-xl border border-gray-200 transition-colors whitespace-nowrap"
          >
            <Tv className="w-3.5 h-3.5 text-[#cb7d87]" />
            <span>Modo Telão</span>
          </Link>

          <Link
            href={`/e/${event.slug}/guestbook`}
            target="_blank"
            className="shrink-0 flex items-center justify-center gap-1.5 text-xs text-gray-700 hover:text-[#cb7d87] bg-gray-50 hover:bg-rose-50/50 px-3 py-2 rounded-xl border border-gray-200 transition-colors whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#cb7d87]" />
            <span>Livro</span>
          </Link>

          <button
            onClick={copyAdminLink}
            className="shrink-0 flex items-center justify-center gap-1.5 text-xs text-gray-700 hover:text-[#cb7d87] bg-gray-50 hover:bg-rose-50/50 px-3 py-2 rounded-xl border border-gray-200 transition-colors cursor-pointer whitespace-nowrap"
            title="Copiar link da área de administração"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedLink ? "Copiado!" : "Copiar Link"}</span>
          </button>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="shrink-0 flex items-center justify-center gap-1.5 text-xs text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl border border-red-200 transition-colors cursor-pointer whitespace-nowrap"
            title="Encerrar sessão de administração"
          >
            {isLoggingOut ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
            <span>Sair</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 my-5 sm:my-6">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-xs text-center">
          <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{photos.length}</span>
          <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-0.5">Total de Fotos</p>
        </div>
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-xs text-center">
          <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-emerald-600">{approvedCount}</span>
          <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-0.5">Aprovadas</p>
        </div>
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-xs text-center">
          <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-amber-500">{pendingCount}</span>
          <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-0.5">Pendentes</p>
        </div>
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-xs text-center">
          <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#cb7d87]">{tables.length}</span>
          <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-0.5">Mesas Registadas</p>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="flex border-b border-gray-100 gap-1.5 sm:gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
        <button
          onClick={() => setActiveTab("photos")}
          className={`shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "photos"
              ? "bg-[#cb7d87] text-white shadow-sm shadow-[#cb7d87]/25"
              : "bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-[#cb7d87]"
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Moderação de Fotos</span>
          {pendingCount > 0 && (
            <span className="bg-amber-400 text-gray-950 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("tables")}
          className={`shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "tables"
              ? "bg-[#cb7d87] text-white shadow-sm shadow-[#cb7d87]/25"
              : "bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-[#cb7d87]"
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Mesas & Cartões QR</span>
        </button>

        <button
          onClick={() => setActiveTab("quests")}
          className={`shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "quests"
              ? "bg-[#cb7d87] text-white shadow-sm shadow-[#cb7d87]/25"
              : "bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-[#cb7d87]"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Desafios de Fotos</span>
        </button>

        <button
          onClick={() => setActiveTab("chat")}
          className={`shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "chat"
              ? "bg-[#cb7d87] text-white shadow-sm shadow-[#cb7d87]/25"
              : "bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-[#cb7d87]"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Mural de Recados</span>
        </button>

        <button
          onClick={() => setActiveTab("moments")}
          className={`shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "moments"
              ? "bg-[#cb7d87] text-white shadow-sm shadow-[#cb7d87]/25"
              : "bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-[#cb7d87]"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Cronograma de Momentos</span>
        </button>

        <button
          onClick={() => setActiveTab("bundle")}
          className={`shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "bundle"
              ? "bg-[#cb7d87] text-white shadow-sm shadow-[#cb7d87]/25"
              : "bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-[#cb7d87]"
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Photo Bundle (ZIP)</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "settings"
              ? "bg-[#cb7d87] text-white shadow-sm shadow-[#cb7d87]/25"
              : "bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-[#cb7d87]"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Configurações</span>
        </button>
      </div>

      {/* TAB CONTENT 1: PHOTOS MODERATION */}
      {activeTab === "photos" && (
        <div>
          {/* Subfilter pills */}
          <div className="flex items-center gap-1.5 sm:gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setPhotoFilter("all")}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer transition-colors ${
                photoFilter === "all"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Todas ({photos.length})
            </button>
            <button
              onClick={() => setPhotoFilter("pending")}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer transition-colors ${
                photoFilter === "pending"
                  ? "bg-amber-500 text-white"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              Pendentes ({pendingCount})
            </button>
            <button
              onClick={() => setPhotoFilter("approved")}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer transition-colors ${
                photoFilter === "approved"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              Aprovadas ({approvedCount})
            </button>
            <button
              onClick={() => setPhotoFilter("hidden")}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer transition-colors ${
                photoFilter === "hidden"
                  ? "bg-gray-700 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Ocultas ({hiddenCount})
            </button>
          </div>

          {displayedPhotos.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-3xl border border-gray-100">
              <p className="text-sm font-medium text-gray-500">Nenhuma foto nesta categoria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-4">
              {displayedPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="relative aspect-square bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.guestName || "Foto"}
                      className="w-full h-full object-cover"
                    />
                    <span
                      className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase backdrop-blur-xs ${
                        photo.status === "approved"
                          ? "bg-emerald-600/95 text-white"
                          : photo.status === "pending"
                          ? "bg-amber-500/95 text-white"
                          : "bg-gray-800/95 text-white"
                      }`}
                    >
                      {photo.status === "approved"
                        ? "Aprovada"
                        : photo.status === "pending"
                        ? "Pendente"
                        : "Oculta"}
                    </span>
                    {photo.tableIdentifier && (
                      <span className="absolute bottom-2 left-2 text-[10px] bg-gray-900/80 backdrop-blur-xs text-white px-2 py-0.5 rounded-full font-medium">
                        {photo.tableIdentifier}
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between">
                    <div>
                      {photo.guestName && (
                        <p className="text-xs font-semibold text-[#cb7d87] truncate">
                          {photo.guestName}
                        </p>
                      )}
                      {photo.message && (
                        <p className="text-[11px] text-gray-600 italic line-clamp-2 mt-0.5">
                          &ldquo;{photo.message}&rdquo;
                        </p>
                      )}

                      {/* Engagement stats */}
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
                        <span className="flex items-center gap-1 font-medium">
                          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                          {photo.likeCount || 0}
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <MessageSquare className="w-3.5 h-3.5 text-[#cb7d87]" />
                          {photo.commentCount || 0}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-gray-100">
                      {photo.status !== "approved" && (
                        <button
                          onClick={() => handlePhotoStatus(photo.id, "approved")}
                          className="flex-1 p-1 sm:p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          title="Aprovar Foto"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Aprovar</span>
                        </button>
                      )}

                      {photo.status !== "hidden" && (
                        <button
                          onClick={() => handlePhotoStatus(photo.id, "hidden")}
                          className="flex-1 p-1 sm:p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          title="Ocultar Foto"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Ocultar</span>
                        </button>
                      )}

                      <button
                        onClick={() => setPhotoToDelete(photo)}
                        className="p-1 sm:p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] transition-colors cursor-pointer shrink-0"
                        title="Excluir Foto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: TABLES & QR CODES */}
      {activeTab === "tables" && (
        <div className="space-y-6 sm:space-y-8">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">Gerar Mesas Adicionais</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Adicione novas mesas para gerar QR Codes individuais automaticamente.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <input
                type="number"
                min="1"
                max="50"
                value={newTableCount}
                onChange={(e) => setNewTableCount(Number(e.target.value))}
                className="w-20 px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-xs text-center text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#cb7d87]"
              />
              <button
                onClick={handleGenerateTables}
                disabled={isGeneratingTables}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-[#cb7d87] hover:bg-[#b86a76] disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isGeneratingTables ? "Gerando..." : "Adicionar Mesas"}</span>
              </button>
            </div>
          </div>

          <TableCardsPrinter
            eventTitle={event.title}
            tables={tables}
            genericUrl={`${window.location.origin}/e/${event.slug}`}
          />
        </div>
      )}

      {/* TAB CONTENT 3: PHOTO QUESTS */}
      {activeTab === "quests" && (
        <HostQuestsManager slug={event.slug} hostKey={event.hostKey} />
      )}

      {/* TAB CONTENT 4: CHAT MODERATION */}
      {activeTab === "chat" && (
        <HostChatManager slug={event.slug} hostKey={event.hostKey} />
      )}

      {/* TAB CONTENT: WEDDING MOMENTS SCHEDULE */}
      {activeTab === "moments" && (
        <div className="bg-white border border-gray-100 rounded-3xl p-4 sm:p-6 md:p-8 max-w-2xl mx-auto shadow-sm space-y-5 sm:space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider font-semibold bg-rose-50 text-[#cb7d87] border border-[#cb7d87]/20 px-2.5 py-0.5 rounded-full">
                  Horários do Evento
                </span>
                <span className="text-xs text-gray-400 font-medium">
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
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-[#cb7d87] hover:bg-[#b86a76] text-white px-4 py-2.5 rounded-xl font-semibold text-xs shadow-xs transition-colors shrink-0 cursor-pointer"
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
                      <span className="text-[10px] font-bold text-gray-500 bg-white px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg border border-gray-200 shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => handleMoveMoment(idx, "up")}
                          disabled={idx === 0}
                          className="p-0.5 text-gray-400 hover:text-[#cb7d87] disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                          title="Mover para cima"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveMoment(idx, "down")}
                          disabled={idx === moments.length - 1}
                          className="p-0.5 text-gray-400 hover:text-[#cb7d87] disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
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
                      className="w-9 h-9 sm:w-10 sm:h-10 text-center text-lg sm:text-xl bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#cb7d87] shrink-0"
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
                        className="w-20 sm:w-24 px-1.5 sm:px-2 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#cb7d87]"
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
                        className="w-20 sm:w-24 px-1.5 sm:px-2 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#cb7d87]"
                      />
                    </div>

                    {/* Delete stage button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveMoment(idx)}
                      disabled={moments.length <= 1}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed shrink-0"
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
                  className="w-full text-xs text-gray-600 bg-white border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#cb7d87]"
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
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-rose-50 text-gray-700 hover:text-[#cb7d87] px-3.5 sm:px-4 py-2.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Etapa</span>
              </button>

              <button
                type="button"
                disabled={isSavingMoments}
                onClick={handleSaveMoments}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#cb7d87] hover:bg-[#b86a76] active:scale-95 disabled:opacity-50 text-white px-5 sm:px-6 py-2.5 rounded-xl font-semibold text-xs shadow-md shadow-[#cb7d87]/25 transition-all cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{isSavingMoments ? "Salvando..." : "Salvar Cronograma"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: PHOTO BUNDLE EXPORT (ZIP) */}
      {activeTab === "bundle" && (
        <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-8 text-center max-w-xl mx-auto shadow-sm">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-rose-50 flex items-center justify-center text-[#cb7d87] mx-auto mb-4 ring-4 ring-[#cb7d87]/15">
            <Download className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>

          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Exportar Photo Bundle (.ZIP)</h3>
          <p className="text-xs text-gray-500 mt-2 mb-6 max-w-md mx-auto leading-relaxed">
            Faça o download de todas as <strong>{approvedCount} fotos aprovadas</strong> do casamento em um único arquivo compactado. As fotos vêm organizadas com o nome da mesa e o autor, acompanhadas de um documento de texto com todas as dedicatórias dos convidados. Perfeito para arquivar nos seus 2TB do <strong>Google Drive</strong>!
          </p>

          <a
            href={`/api/events/${event.slug}/bundle?key=${event.hostKey}`}
            download
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#cb7d87] hover:bg-[#b86a76] text-white px-6 sm:px-8 py-3.5 rounded-2xl font-semibold text-sm shadow-md shadow-[#cb7d87]/25 transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Baixar Todas as Fotos (.ZIP)</span>
          </a>
        </div>
      )}

      {/* TAB CONTENT 6: SETTINGS */}
      {activeTab === "settings" && (
        <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-8 max-w-xl mx-auto shadow-sm space-y-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#cb7d87]" />
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">Configurações do Evento</h3>
          </div>

          {/* Toggle uploads */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-900">Recebimento de Fotos</p>
              <p className="text-xs text-gray-500">Permitir ou encerrar o envio de fotos dos convidados</p>
            </div>
            <button
              onClick={() => handleToggleUploads(!event.isUploadClosed)}
              className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors text-center ${
                event.isUploadClosed
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-red-50 text-red-700 hover:bg-red-100"
              }`}
            >
              {event.isUploadClosed ? "Reabrir Envios" : "Encerrar Envios"}
            </button>
          </div>

          {/* Moderation policy */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-900">Moderação de Entrada</p>
              <p className="text-xs text-gray-500">Publicar diretamente ou exigir aprovação do Host</p>
            </div>
            <select
              value={event.moderationPolicy}
              onChange={(e) => handleChangePolicy(e.target.value as any)}
              className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-xs font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#cb7d87]"
            >
              <option value="immediate">Publicação Direta</option>
              <option value="approval_required">Aprovação Obrigatória</option>
            </select>
          </div>

          {/* Host Key display */}
          <div>
            <p className="text-sm font-semibold text-gray-900">Host Key (Chave Secreta)</p>
            <p className="text-xs text-gray-500 mb-2">Chave de acesso administrativo do anfitrião</p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                readOnly
                value={event.hostKey}
                className="w-full text-xs font-mono bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-gray-800"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(event.hostKey);
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 2000);
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-[#cb7d87] hover:bg-[#b86a76] text-white rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition-colors shadow-xs text-center"
              >
                {copiedKey ? "Copiado!" : "Copiar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Host Photo Delete Confirmation Modal */}
      {photoToDelete && (
        <div
          onClick={() => {
            if (!isDeletingPhoto) setPhotoToDelete(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-gray-100 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center"
          >
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Excluir Foto?
            </h3>

            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              Tem certeza que deseja excluir esta foto permanentemente do evento?
            </p>

            <div className="my-3 mx-auto w-24 h-24 rounded-2xl overflow-hidden border border-gray-200 shadow-inner bg-gray-100 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoToDelete.url}
                alt="Prévia"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={isDeletingPhoto}
                onClick={() => setPhotoToDelete(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingPhoto}
                onClick={confirmDeletePhoto}
                className="flex-1 py-2.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isDeletingPhoto ? <span>Excluindo...</span> : <span>Sim, Excluir</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
