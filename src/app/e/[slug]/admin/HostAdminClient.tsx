"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera,
  Download,
  QrCode,
  Settings,
  Clock,
  Copy,
  ExternalLink,
  Tv,
  MessageSquare,
  Sparkles,
  BookOpen,
  LogOut,
  Loader2,
} from "lucide-react";
import { MonogramLogo } from "@/components/MonogramLogo";
import { TableItem } from "@/components/TableCardsPrinter";
import { PhotoItem } from "@/components/LiveGalleryView";
import { HostQuestsManager } from "@/components/HostQuestsManager";
import { HostChatManager } from "@/components/HostChatManager";
import { WeddingMomentConfig, DEFAULT_WEDDING_MOMENTS } from "@/lib/moments";
import { HostKeyGate } from "./tabs/HostKeyGate";
import { PhotosModerationTab } from "./tabs/PhotosModerationTab";
import { TablesTab } from "./tabs/TablesTab";
import { MomentsTab } from "./tabs/MomentsTab";
import { BundleTab } from "./tabs/BundleTab";
import { SettingsTab } from "./tabs/SettingsTab";

type AdminTab = "photos" | "tables" | "quests" | "chat" | "moments" | "bundle" | "settings";

const ADMIN_TABS: Array<{ id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "photos", label: "Moderação de Fotos", icon: Camera },
  { id: "tables", label: "Mesas & Cartões QR", icon: QrCode },
  { id: "quests", label: "Desafios", icon: Sparkles },
  { id: "chat", label: "Recados", icon: MessageSquare },
  { id: "moments", label: "Cronograma de Momentos", icon: Clock },
  { id: "bundle", label: "Photo Bundle (ZIP)", icon: Download },
  { id: "settings", label: "Configurações", icon: Settings },
];

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
  const router = useRouter();
  const [event, setEvent] = useState(initialEvent);
  const [photos, setPhotos] = useState<PhotoItem[]>(initialPhotos);
  const [tables, setTables] = useState<TableItem[]>(initialTables);
  const [isAuthorized, setIsAuthorized] = useState(initialAuthorized);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("photos");
  const [copiedLink, setCopiedLink] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      router.replace("/");
      router.refresh();
    }
  };

  // Copy management link
  const copyAdminLink = () => {
    const fullUrl = `${window.location.origin}/`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!isAuthorized) {
    return (
      <HostKeyGate
        slug={event.slug}
        hostKey={event.hostKey}
        initialKey={providedKey}
        onAuthorized={() => setIsAuthorized(true)}
      />
    );
  }

  const pendingCount = photos.filter((p) => p.status === "pending").length;
  const approvedCount = photos.filter((p) => p.status === "approved").length;

  return (
    <div className="pt-6">
      {/* Top Navbar / Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-marsala-ink flex items-center justify-center shadow-md shadow-[#cb7d87]/20 shrink-0 ring-2 ring-[#cb7d87]/15">
            <MonogramLogo size={26} color="#ffffff" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-rose-50 text-marsala-ink border border-[#cb7d87]/20 px-2.5 py-0.5 rounded-full shrink-0">
                <Sparkles className="w-3 h-3 text-marsala-ink" />
                <span>Olá, {loggedUser || "Noivos"} ✨</span>
              </span>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${
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
            className="shrink-0 flex items-center justify-center gap-1.5 text-xs text-gray-700 hover:text-marsala-ink bg-gray-50 hover:bg-rose-50/50 px-3 py-2 rounded-xl border border-gray-200 transition-colors whitespace-nowrap"
          >
            <span>Ver Galeria</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <Link
            href={`/e/${event.slug}/slideshow`}
            target="_blank"
            className="shrink-0 flex items-center justify-center gap-1.5 text-xs text-gray-700 hover:text-marsala-ink bg-gray-50 hover:bg-rose-50/50 px-3 py-2 rounded-xl border border-gray-200 transition-colors whitespace-nowrap"
          >
            <Tv className="w-3.5 h-3.5 text-marsala-ink" />
            <span>Modo Telão</span>
          </Link>

          <Link
            href={`/e/${event.slug}/guestbook`}
            target="_blank"
            className="shrink-0 flex items-center justify-center gap-1.5 text-xs text-gray-700 hover:text-marsala-ink bg-gray-50 hover:bg-rose-50/50 px-3 py-2 rounded-xl border border-gray-200 transition-colors whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5 text-marsala-ink" />
            <span>Livro</span>
          </Link>

          <button
            onClick={copyAdminLink}
            className="shrink-0 flex items-center justify-center gap-1.5 text-xs text-gray-700 hover:text-marsala-ink bg-gray-50 hover:bg-rose-50/50 px-3 py-2 rounded-xl border border-gray-200 transition-colors cursor-pointer whitespace-nowrap"
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
          <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-marsala-ink">{tables.length}</span>
          <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-0.5">Mesas</p>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="flex border-b border-gray-100 gap-1.5 sm:gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
        {ADMIN_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === id
                ? "bg-marsala-ink text-white shadow-sm shadow-[#cb7d87]/25"
                : "bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-marsala-ink"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
            {id === "photos" && pendingCount > 0 && (
              <span className="bg-amber-400 text-gray-950 text-[11px] px-1.5 py-0.2 rounded-full font-bold">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "photos" && (
        <PhotosModerationTab
          slug={event.slug}
          hostKey={event.hostKey}
          photos={photos}
          onPhotoStatusChange={(photoId, status) =>
            setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, status } : p)))
          }
          onPhotoDeleted={(photoId) => setPhotos((prev) => prev.filter((p) => p.id !== photoId))}
        />
      )}

      {activeTab === "tables" && (
        <TablesTab
          slug={event.slug}
          hostKey={event.hostKey}
          eventTitle={event.title}
          tables={tables}
          onTablesCreated={(created) => setTables((prev) => [...prev, ...created])}
        />
      )}

      {activeTab === "quests" && <HostQuestsManager slug={event.slug} hostKey={event.hostKey} />}

      {activeTab === "chat" && <HostChatManager slug={event.slug} hostKey={event.hostKey} />}

      {activeTab === "moments" && (
        <MomentsTab slug={event.slug} hostKey={event.hostKey} initialMoments={initialMoments} />
      )}

      {activeTab === "bundle" && <BundleTab slug={event.slug} hostKey={event.hostKey} />}

      {activeTab === "settings" && (
        <SettingsTab
          slug={event.slug}
          hostKey={event.hostKey}
          isUploadClosed={event.isUploadClosed}
          moderationPolicy={event.moderationPolicy}
          onSettingsChange={(patch) => setEvent((prev) => ({ ...prev, ...patch }))}
        />
      )}
    </div>
  );
}
