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
  Printer,
  QrCode,
  Settings,
  Clock,
  Shield,
  Copy,
  ExternalLink,
  Plus,
  RefreshCw,
  Tv,
  Heart,
  MessageSquare,
} from "lucide-react";
import { MonogramLogo } from "@/components/MonogramLogo";
import { TableCardsPrinter, TableItem } from "@/components/TableCardsPrinter";
import { PhotoItem } from "@/components/LiveGalleryView";

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
  initialTables: any[];
  initialPhotos: PhotoItem[];
  initialAuthorized: boolean;
  providedKey: string;
}

export function HostAdminClient({
  event: initialEvent,
  initialTables,
  initialPhotos,
  initialAuthorized,
  providedKey,
}: HostAdminClientProps) {
  const [event, setEvent] = useState(initialEvent);
  const [photos, setPhotos] = useState<PhotoItem[]>(initialPhotos);
  const [tables, setTables] = useState<TableItem[]>(initialTables);
  const [keyInput, setKeyInput] = useState(providedKey);
  const [isAuthorized, setIsAuthorized] = useState(initialAuthorized);
  const [authError, setAuthError] = useState("");

  const [activeTab, setActiveTab] = useState<"photos" | "tables" | "bundle" | "settings">("photos");
  const [photoFilter, setPhotoFilter] = useState<"all" | "pending" | "approved" | "hidden">("all");

  const [newTableCount, setNewTableCount] = useState<number>(5);
  const [isGeneratingTables, setIsGeneratingTables] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Photo delete confirmation state
  const [photoToDelete, setPhotoToDelete] = useState<PhotoItem | null>(null);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);

  // Authorization check
  const handleAuthorize = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyInput.trim() === event.hostKey) {
      setIsAuthorized(true);
      setAuthError("");
      const newUrl = `${window.location.pathname}?key=${keyInput.trim()}`;
      window.history.replaceState(null, "", newUrl);
    } else {
      setAuthError("Chave de Host incorreta. Verifique o link ou a chave fornecida na criação.");
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
    const fullUrl = `${window.location.origin}/e/${event.slug}/admin?key=${event.hostKey}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // If not authorized, show PIN / Key unlock prompt
  if (!isAuthorized) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="bg-[#fffaf5] border border-[#cb7d87]/30 rounded-3xl p-8 max-w-md w-full shadow-lg text-center">
          <div className="w-16 h-16 rounded-full bg-[#cb7d87]/15 flex items-center justify-center text-[#cb7d87] mx-auto mb-4">
            <Key className="w-8 h-8" />
          </div>

          <h2 className="font-serif text-3xl text-[#5a6248] font-medium">Acesso de Anfitrião</h2>
          <p className="text-xs text-[#7c8764] mt-1 mb-6">
            Introduza a sua <strong>Host Key</strong> para aceder à gestão de fotos, mesas e exportação do evento.
          </p>

          <form onSubmit={handleAuthorize} className="space-y-4">
            <input
              type="text"
              required
              placeholder="Introduza a sua Host Key (ex: amor2026)"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#cb7d87]/30 bg-white focus:outline-none focus:border-[#cb7d87] text-center font-mono text-sm text-[#49503b]"
            />

            {authError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{authError}</p>}

            <button
              type="submit"
              className="w-full bg-[#cb7d87] hover:bg-[#b86a76] text-white py-3 rounded-xl font-serif text-lg tracking-wide shadow-sm cursor-pointer"
            >
              Desbloquear Painel
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#cb7d87]/20">
            <Link href={`/e/${event.slug}`} className="text-xs text-[#5a6248] hover:text-[#cb7d87]">
              ← Voltar à Galeria Pública
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#cb7d87]/20">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold bg-[#cb7d87]/20 text-[#832d3b] px-2.5 py-0.5 rounded-full">
              Painel do Anfitrião
            </span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                event.isUploadClosed
                  ? "bg-red-100 text-red-700"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {event.isUploadClosed ? "Uploads Fechados" : "Uploads Abertos"}
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#5a6248] mt-1 font-medium">
            {event.title}
          </h1>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href={`/e/${event.slug}`}
            target="_blank"
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs text-[#5a6248] hover:text-[#cb7d87] bg-[#fffaf5] px-4 py-2 rounded-full border border-[#cb7d87]/30 shadow-xs"
          >
            <span>Ver Galeria</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={copyAdminLink}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs bg-[#cb7d87] hover:bg-[#b86a76] text-white px-4 py-2 rounded-full shadow-xs cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedLink ? "Copiado!" : "Copiar Link Admin"}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
        <div className="bg-[#fffaf5] p-4 rounded-2xl border border-[#cb7d87]/20 text-center">
          <span className="text-2xl font-serif text-[#5a6248] font-bold">{photos.length}</span>
          <p className="text-[11px] text-[#7c8764] mt-0.5">Total de Fotos</p>
        </div>
        <div className="bg-[#fffaf5] p-4 rounded-2xl border border-[#cb7d87]/20 text-center">
          <span className="text-2xl font-serif text-emerald-700 font-bold">{approvedCount}</span>
          <p className="text-[11px] text-[#7c8764] mt-0.5">Aprovadas</p>
        </div>
        <div className="bg-[#fffaf5] p-4 rounded-2xl border border-[#cb7d87]/20 text-center">
          <span className="text-2xl font-serif text-amber-600 font-bold">{pendingCount}</span>
          <p className="text-[11px] text-[#7c8764] mt-0.5">Pendentes</p>
        </div>
        <div className="bg-[#fffaf5] p-4 rounded-2xl border border-[#cb7d87]/20 text-center">
          <span className="text-2xl font-serif text-[#cb7d87] font-bold">{tables.length}</span>
          <p className="text-[11px] text-[#7c8764] mt-0.5">Mesas Registadas</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#cb7d87]/20 gap-2 mb-6 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("photos")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-serif text-base transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === "photos"
              ? "bg-[#cb7d87] text-white shadow-xs"
              : "bg-[#fffaf5] text-[#5a6248] hover:bg-[#fbead6]"
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Moderação de Fotos</span>
          {pendingCount > 0 && (
            <span className="bg-amber-400 text-black text-[10px] px-1.5 py-0.2 rounded-full font-sans font-bold">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("tables")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-serif text-base transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === "tables"
              ? "bg-[#cb7d87] text-white shadow-xs"
              : "bg-[#fffaf5] text-[#5a6248] hover:bg-[#fbead6]"
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Mesas & Cartões QR</span>
        </button>

        <button
          onClick={() => setActiveTab("bundle")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-serif text-base transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === "bundle"
              ? "bg-[#cb7d87] text-white shadow-xs"
              : "bg-[#fffaf5] text-[#5a6248] hover:bg-[#fbead6]"
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Photo Bundle (ZIP)</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-serif text-base transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === "settings"
              ? "bg-[#cb7d87] text-white shadow-xs"
              : "bg-[#fffaf5] text-[#5a6248] hover:bg-[#fbead6]"
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
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setPhotoFilter("all")}
              className={`text-xs px-3 py-1 rounded-full ${
                photoFilter === "all" ? "bg-[#5a6248] text-white" : "bg-[#fffaf5] text-[#5a6248]"
              }`}
            >
              Todas ({photos.length})
            </button>
            <button
              onClick={() => setPhotoFilter("pending")}
              className={`text-xs px-3 py-1 rounded-full ${
                photoFilter === "pending" ? "bg-amber-500 text-white" : "bg-[#fffaf5] text-amber-700"
              }`}
            >
              Pendentes ({pendingCount})
            </button>
            <button
              onClick={() => setPhotoFilter("approved")}
              className={`text-xs px-3 py-1 rounded-full ${
                photoFilter === "approved" ? "bg-emerald-600 text-white" : "bg-[#fffaf5] text-emerald-800"
              }`}
            >
              Aprovadas ({approvedCount})
            </button>
            <button
              onClick={() => setPhotoFilter("hidden")}
              className={`text-xs px-3 py-1 rounded-full ${
                photoFilter === "hidden" ? "bg-gray-600 text-white" : "bg-[#fffaf5] text-gray-700"
              }`}
            >
              Ocultas ({hiddenCount})
            </button>
          </div>

          {displayedPhotos.length === 0 ? (
            <div className="text-center py-16 bg-[#fffaf5] rounded-3xl border border-[#cb7d87]/20">
              <p className="font-serif text-xl text-[#5a6248]">Nenhuma foto nesta categoria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {displayedPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="bg-[#fffaf5] border border-[#cb7d87]/25 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between"
                >
                  <div className="relative aspect-square bg-[#fbead6]/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.guestName || "Foto"}
                      className="w-full h-full object-cover"
                    />
                    <span
                      className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                        photo.status === "approved"
                          ? "bg-emerald-600/90 text-white"
                          : photo.status === "pending"
                          ? "bg-amber-500/90 text-white"
                          : "bg-gray-700/90 text-white"
                      }`}
                    >
                      {photo.status === "approved"
                        ? "Aprovada"
                        : photo.status === "pending"
                        ? "Pendente"
                        : "Oculta"}
                    </span>
                    {photo.tableIdentifier && (
                      <span className="absolute bottom-2 left-2 text-[10px] bg-[#5a6248]/90 text-white px-2 py-0.5 rounded-full">
                        {photo.tableIdentifier}
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 flex-1 flex flex-col justify-between">
                    <div>
                      {photo.guestName && (
                        <p className="text-xs font-semibold text-[#cb7d87] truncate">
                          {photo.guestName}
                        </p>
                      )}
                      {photo.message && (
                        <p className="text-[11px] text-[#49503b] italic line-clamp-2 mt-0.5">
                          &ldquo;{photo.message}&rdquo;
                        </p>
                      )}

                      {/* Engagement stats */}
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-[#5a6248]">
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
                    <div className="flex items-center gap-1 mt-3 pt-2 border-t border-[#cb7d87]/15">
                      {photo.status !== "approved" && (
                        <button
                          onClick={() => handlePhotoStatus(photo.id, "approved")}
                          className="flex-1 p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
                          title="Aprovar Foto"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Aprovar</span>
                        </button>
                      )}

                      {photo.status !== "hidden" && (
                        <button
                          onClick={() => handlePhotoStatus(photo.id, "hidden")}
                          className="flex-1 p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
                          title="Ocultar Foto"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Ocultar</span>
                        </button>
                      )}

                      <button
                        onClick={() => setPhotoToDelete(photo)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[11px] transition-colors"
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
        <div className="space-y-8">
          <div className="bg-[#fffaf5] p-5 rounded-2xl border border-[#cb7d87]/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-serif text-xl text-[#5a6248]">Gerar Mesas Adicionais</h3>
              <p className="text-xs text-[#7c8764]">
                Adicione novas mesas para gerar QR Codes individuais automaticamente.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="50"
                value={newTableCount}
                onChange={(e) => setNewTableCount(Number(e.target.value))}
                className="w-20 px-3 py-2 border border-[#cb7d87]/30 rounded-xl bg-white text-xs text-center text-[#49503b]"
              />
              <button
                onClick={handleGenerateTables}
                disabled={isGeneratingTables}
                className="flex items-center gap-1.5 bg-[#cb7d87] hover:bg-[#b86a76] text-white px-4 py-2 rounded-xl text-xs font-serif font-medium cursor-pointer"
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

      {/* TAB CONTENT 3: PHOTO BUNDLE EXPORT (ZIP) */}
      {activeTab === "bundle" && (
        <div className="bg-[#fffaf5] border border-[#cb7d87]/30 rounded-3xl p-6 sm:p-8 text-center max-w-xl mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#cb7d87]/15 flex items-center justify-center text-[#cb7d87] mx-auto mb-4">
            <Download className="w-8 h-8" />
          </div>

          <h3 className="font-serif text-3xl text-[#5a6248]">Exportar Photo Bundle (.ZIP)</h3>
          <p className="text-xs text-[#7c8764] mt-2 mb-6 max-w-md mx-auto leading-relaxed">
            Faça o download de todas as <strong>{approvedCount} fotos aprovadas</strong> do casamento em um único arquivo compactado. As fotos vêm organizadas com o nome da mesa e o autor, acompanhadas de um documento de texto com todas as dedicatórias dos convidados. Perfeito para arquivar nos seus 2TB do <strong>Google Drive</strong>!
          </p>

          <a
            href={`/api/events/${event.slug}/bundle?key=${event.hostKey}`}
            download
            className="inline-flex items-center justify-center gap-2 bg-[#cb7d87] hover:bg-[#b86a76] text-white px-8 py-3.5 rounded-full font-serif text-lg tracking-wide shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-5 h-5 text-[#ebca90]" />
            <span>Baixar Todas as Fotos (.ZIP)</span>
          </a>
        </div>
      )}

      {/* TAB CONTENT 4: SETTINGS */}
      {activeTab === "settings" && (
        <div className="bg-[#fffaf5] border border-[#cb7d87]/30 rounded-3xl p-6 max-w-xl mx-auto space-y-6">
          <h3 className="font-serif text-2xl text-[#5a6248]">Configurações do Evento</h3>

          {/* Toggle uploads */}
          <div className="flex items-center justify-between pb-4 border-b border-[#cb7d87]/20">
            <div>
              <p className="text-sm font-semibold text-[#5a6248]">Recebimento de Fotos</p>
              <p className="text-xs text-[#7c8764]">Permitir ou encerrar o envio de fotos dos convidados</p>
            </div>
            <button
              onClick={() => handleToggleUploads(!event.isUploadClosed)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                event.isUploadClosed
                  ? "bg-emerald-600 text-white"
                  : "bg-red-100 text-red-700 hover:bg-red-200"
              }`}
            >
              {event.isUploadClosed ? "Reabrir Envios" : "Encerrar Envios"}
            </button>
          </div>

          {/* Moderation policy */}
          <div className="flex items-center justify-between pb-4 border-b border-[#cb7d87]/20">
            <div>
              <p className="text-sm font-semibold text-[#5a6248]">Moderação de Entrada</p>
              <p className="text-xs text-[#7c8764]">Publicar diretamente ou exigir aprovação do Host</p>
            </div>
            <select
              value={event.moderationPolicy}
              onChange={(e) => handleChangePolicy(e.target.value as any)}
              className="px-3 py-2 border border-[#cb7d87]/30 rounded-xl bg-white text-xs text-[#49503b]"
            >
              <option value="immediate">Publicação Direta</option>
              <option value="approval_required">Aprovação Obrigatória</option>
            </select>
          </div>

          {/* Host Key display */}
          <div>
            <p className="text-sm font-semibold text-[#5a6248]">Host Key (Chave Secreta)</p>
            <p className="text-xs text-[#7c8764] mb-2">Guarde esta chave para acessar o painel de administração</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={event.hostKey}
                className="w-full text-xs font-mono bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-[#49503b]"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(event.hostKey);
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 2000);
                }}
                className="px-4 py-2.5 bg-[#cb7d87] text-white rounded-xl text-xs shrink-0 cursor-pointer transition-colors"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#fffaf5] border border-[#cb7d87]/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center"
          >
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="font-serif text-xl text-[#5a6248] font-medium mb-1">
              Excluir Foto?
            </h3>

            <p className="text-xs text-[#7c8764] leading-relaxed mb-3">
              Tem certeza que deseja excluir esta foto permanentemente do evento?
            </p>

            <div className="my-3 mx-auto w-24 h-24 rounded-2xl overflow-hidden border border-[#cb7d87]/20 shadow-inner bg-[#fbead6]/40 flex items-center justify-center">
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
                className="flex-1 py-2 text-xs font-medium text-[#7c8764] hover:bg-[#fbead6]/50 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingPhoto}
                onClick={confirmDeletePhoto}
                className="flex-1 py-2 text-xs font-medium bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
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
