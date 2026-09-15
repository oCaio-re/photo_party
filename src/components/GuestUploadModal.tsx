"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  ImageIcon,
  X,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Video,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";
import { compressImage } from "@/lib/client-compress";
import {
  WeddingMomentConfig,
  DEFAULT_WEDDING_MOMENTS,
  getCurrentActiveMomentId,
} from "@/lib/moments";

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const tempUrl = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(tempUrl);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(tempUrl);
      reject(new Error("Erro ao ler vídeo"));
    };
    video.src = tempUrl;
  });
}

interface GuestUploadModalProps {
  slug: string;
  tableId?: string;
  tableName?: string;
  onUploadComplete?: () => void;
  isUploadClosed?: boolean;
  momentsConfig?: WeddingMomentConfig[];
}

export function GuestUploadModal({
  slug,
  tableId,
  tableName,
  onUploadComplete,
  isUploadClosed = false,
  momentsConfig = DEFAULT_WEDDING_MOMENTS,
}: GuestUploadModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [useVintagePreset, setUseVintagePreset] = useState(true);

  // Initial preview URL before compression finishes
  const [initialPreviewUrl, setInitialPreviewUrl] = useState<string | null>(null);

  // Vintage processed version
  const [vintageBlob, setVintageBlob] = useState<Blob | null>(null);
  const [vintagePreviewUrl, setVintagePreviewUrl] = useState<string | null>(null);
  const [vintageSize, setVintageSize] = useState<number>(0);

  // Raw original processed version
  const [rawBlob, setRawBlob] = useState<Blob | null>(null);
  const [rawPreviewUrl, setRawPreviewUrl] = useState<string | null>(null);
  const [rawSize, setRawSize] = useState<number>(0);

  const [originalFileSize, setOriginalFileSize] = useState<number>(0);

  const displayPreviewUrl =
    (useVintagePreset ? vintagePreviewUrl : rawPreviewUrl) || initialPreviewUrl;
  const activeBlob = useVintagePreset ? (vintageBlob || rawBlob) : (rawBlob || vintageBlob);
  const activeCompressedSize = useVintagePreset ? (vintageSize || rawSize) : (rawSize || vintageSize);

  const [guestName, setGuestName] = useState("");
  const [message, setMessage] = useState("");

  const [quests, setQuests] = useState<Array<{ id: string; title: string; icon: string | null }>>([]);
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);

  const moments = momentsConfig && momentsConfig.length > 0 ? momentsConfig : DEFAULT_WEDDING_MOMENTS;
  const [selectedMoment, setSelectedMoment] = useState<string>(() => getCurrentActiveMomentId(moments));
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Fetch available quests
  useEffect(() => {
    fetch(`/api/events/${slug}/quests`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.quests)) {
          setQuests(data.quests);
        }
      })
      .catch(() => {});
  }, [slug]);

  // Listen for fulfill quest triggers
  useEffect(() => {
    const handleQuestEvent = (e: Event) => {
      const ce = e as CustomEvent<{ quest: { id: string; title: string; icon?: string | null } }>;
      if (ce.detail?.quest) {
        setSelectedQuestId(ce.detail.quest.id);
        cameraInputRef.current?.click();
      }
    };
    window.addEventListener("photo_party_fulfill_quest", handleQuestEvent);
    return () => {
      window.removeEventListener("photo_party_fulfill_quest", handleQuestEvent);
    };
  }, []);

  // Listen for open-upload-modal custom event from gallery header or moment teasers
  useEffect(() => {
    const handleOpen = (e: Event) => {
      const ce = e as CustomEvent<{ moment?: string }>;
      if (ce.detail?.moment) {
        setSelectedMoment(ce.detail.moment);
      }
      setIsOpen(true);
    };
    window.addEventListener("open-upload-modal", handleOpen);
    return () => window.removeEventListener("open-upload-modal", handleOpen);
  }, []);

  // Pre-fill name from localStorage if previously stored
  useEffect(() => {
    if (isOpen) {
      const savedName = localStorage.getItem("photo_party_guest_name");
      if (savedName && !guestName) {
        setGuestName(savedName);
      }
    }
  }, [isOpen, guestName]);

  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const cleanupUrls = () => {
    if (initialPreviewUrl) URL.revokeObjectURL(initialPreviewUrl);
    if (vintagePreviewUrl) URL.revokeObjectURL(vintagePreviewUrl);
    if (rawPreviewUrl) URL.revokeObjectURL(rawPreviewUrl);
  };

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      cleanupUrls();
    };
  }, [initialPreviewUrl, vintagePreviewUrl, rawPreviewUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    e.target.value = "";
    if (!selectedFile) return;

    cleanupUrls();
    setErrorMessage(null);
    setSuccessMessage(null);
    setFile(selectedFile);
    setOriginalFileSize(selectedFile.size);

    // Initial raw preview for instant responsiveness
    const initUrl = URL.createObjectURL(selectedFile);
    setInitialPreviewUrl(initUrl);
    setIsOpen(true);

    const isVid = selectedFile.type.startsWith("video/");
    if (isVid) {
      if (selectedFile.size > 15 * 1024 * 1024) {
        setErrorMessage("O vídeo selecionado ultrapassa o limite de 15MB. Por favor, escolha ou grave um clipe menor.");
        return;
      }

      try {
        const dur = await getVideoDuration(selectedFile);
        if (dur > 15.5) {
          setErrorMessage(
            `Vídeos são limitados a 15 segundos para caber no evento. O clipe selecionado tem ${Math.round(
              dur
            )}s. Escolha um clipe de até 15s.`
          );
          return;
        }

        setIsVideo(true);
        setVideoDuration(dur);
        setVintageBlob(selectedFile);
        setRawBlob(selectedFile);
        setVintageSize(selectedFile.size);
        setRawSize(selectedFile.size);
        setVintagePreviewUrl(initUrl);
        setRawPreviewUrl(initUrl);
        return;
      } catch (err) {
        setErrorMessage("Não foi possível carregar os metadados do vídeo. Verifique se o formato é válido.");
        return;
      }
    }

    setIsVideo(false);
    setVideoDuration(0);

    try {
      setIsCompressing(true);
      const [vintageResult, rawResult] = await Promise.all([
        compressImage(selectedFile, { applyVintagePreset: true }),
        compressImage(selectedFile, { applyVintagePreset: false }),
      ]);

      const vUrl = URL.createObjectURL(vintageResult.blob);
      const rUrl = URL.createObjectURL(rawResult.blob);

      setVintageBlob(vintageResult.blob);
      setVintagePreviewUrl(vUrl);
      setVintageSize(vintageResult.blob.size);

      setRawBlob(rawResult.blob);
      setRawPreviewUrl(rUrl);
      setRawSize(rawResult.blob.size);
    } catch (err) {
      console.warn("Client compression failed, using original file:", err);
      setVintageBlob(selectedFile);
      setVintagePreviewUrl(initUrl);
      setVintageSize(selectedFile.size);
      setRawBlob(selectedFile);
      setRawPreviewUrl(initUrl);
      setRawSize(selectedFile.size);
    } finally {
      setIsCompressing(false);
    }
  };

  const resetForm = () => {
    cleanupUrls();
    setFile(null);
    setIsVideo(false);
    setVideoDuration(0);
    setInitialPreviewUrl(null);
    setVintageBlob(null);
    setVintagePreviewUrl(null);
    setVintageSize(0);
    setRawBlob(null);
    setRawPreviewUrl(null);
    setRawSize(0);
    setErrorMessage(null);
    setSuccessMessage(null);
    setUploadProgress(0);
    setSelectedQuestId(null);
    setShowAdvancedOptions(false);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBlob) {
      setErrorMessage("Por favor, selecione uma foto ou clipe de vídeo.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(20);
      setErrorMessage(null);

      // Ensure stable guest session ID
      let sId = localStorage.getItem("photo_party_guest_id");
      if (!sId) {
        sId = crypto.randomUUID();
        localStorage.setItem("photo_party_guest_id", sId);
      }

      if (guestName.trim()) {
        localStorage.setItem("photo_party_guest_name", guestName.trim());
      }

      const formData = new FormData();
      formData.append(
        "file",
        activeBlob,
        file?.name || (isVideo ? "clip.mp4" : "photo.webp")
      );
      formData.append("guestSessionId", sId);
      if (tableId) formData.append("tableId", tableId);
      if (selectedQuestId) formData.append("questId", selectedQuestId);
      if (selectedMoment) formData.append("moment", selectedMoment);
      if (guestName.trim()) formData.append("guestName", guestName.trim());
      if (message.trim()) formData.append("message", message.trim());

      setUploadProgress(50);

      const response = await fetch(`/api/events/${slug}/upload`, {
        method: "POST",
        headers: {
          "x-guest-session-id": sId,
        },
        body: formData,
      });

      setUploadProgress(90);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao publicar a mídia.");
      }

      // Record uploaded photo ID for instant local ownership tracking
      if (data.photo?.id) {
        try {
          const stored = JSON.parse(localStorage.getItem("photo_party_my_photos") || "[]");
          if (Array.isArray(stored)) {
            localStorage.setItem(
              "photo_party_my_photos",
              JSON.stringify([...stored, data.photo.id])
            );
          }
        } catch (e) {
          // ignore
        }
      }

      setUploadProgress(100);
      setSuccessMessage(data.message || "Foto enviada com sucesso!");

      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Falha ao enviar a foto. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  if (isUploadClosed) {
    return null;
  }

  return (
    <>
      {/* Hidden Camera Input (prompts native camera) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Tirar foto com a câmera"
      />

      {/* Hidden Video Input (records short video clip) */}
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Gravar clipe de vídeo"
      />

      {/* Hidden Gallery Input (opens gallery / photo & video library) */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Escolher foto ou vídeo da galeria"
      />

      {/* Centered Floating Upload Pill Button */}
      {!isUploadClosed && (
        <div className="fixed bottom-6 inset-x-0 z-40 flex items-center justify-center pointer-events-none px-4">
          <button
            id="guest-upload-button"
            type="button"
            onClick={() => setIsOpen(true)}
            className="pointer-events-auto flex items-center gap-2 bg-[#cb7d87] hover:bg-[#b86a76] active:scale-95 text-white px-7 py-3.5 rounded-full shadow-[0_10px_25px_rgba(203,125,135,0.45)] transition-all duration-200 font-semibold text-sm sm:text-base tracking-wide cursor-pointer border border-white/20"
            title="Tirar foto ou enviar para o telão"
          >
            <Camera className="w-5 h-5 text-white" />
            <span>Tirar Foto</span>
            {tableName && (
              <span className="text-[11px] bg-black/25 text-white px-2.5 py-0.5 rounded-full ml-0.5 font-medium">
                {tableName}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Upload Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm overscroll-contain animate-fade-in"
          style={{ WebkitOverflowScrolling: "touch" }}
          onClick={() => {
            resetForm();
            setIsOpen(false);
          }}
        >
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white border border-gray-100 rounded-3xl max-w-lg w-full shadow-2xl p-6 relative text-gray-900 my-8 text-left"
            >
              <button
                onClick={() => {
                  resetForm();
                  setIsOpen(false);
                }}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>

              {successMessage ? (
                <div className="text-center py-6 px-2 space-y-4 animate-scale-in">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider text-[#cb7d87] font-bold">
                      Foto Enviada com Sucesso! 🎉
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                      Sua foto já foi para o telão! 🥂
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
                      Obrigado por celebrar com os noivos e deixar essa lembrança inesquecível.
                    </p>
                  </div>

                  <div className="pt-4 space-y-3 max-w-xs mx-auto">
                    <button
                      type="button"
                      onClick={() => {
                        resetForm();
                        setIsOpen(false);
                        window.dispatchEvent(
                          new CustomEvent("photo_party_switch_tab", {
                            detail: { tab: "gallery" },
                          })
                        );
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-[#cb7d87] hover:bg-[#b86a76] active:scale-95 text-white font-semibold text-sm py-3.5 px-5 rounded-2xl shadow-md transition-all cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>Ver Minha Foto na Galeria</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        resetForm();
                        cameraInputRef.current?.click();
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-800 font-semibold text-sm py-3 px-5 rounded-2xl transition-all cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Tirar Mais Uma Foto</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center mb-5">
                    <span className="text-xs uppercase tracking-wider text-[#cb7d87] font-semibold">
                      Recordações ao Vivo
                    </span>
                    <h3 className="text-2xl text-gray-900 font-bold mt-1">
                      Compartilhe um Momento
                    </h3>
                    {tableName && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Enviando da <strong className="text-[#cb7d87]">{tableName}</strong>
                      </p>
                    )}
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Image / Video Picker / Preview Area */}
                    {!displayPreviewUrl ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Option 1: Live Camera */}
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="border-2 border-dashed border-[#cb7d87]/40 hover:border-[#cb7d87] bg-rose-50/40 hover:bg-rose-50 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center cursor-pointer transition-all group active:scale-[0.98] text-center"
                        >
                          <div className="w-12 h-12 rounded-full bg-rose-100/70 flex items-center justify-center text-[#cb7d87] group-hover:scale-110 transition-transform mb-2">
                            <Camera className="w-6 h-6" />
                          </div>
                          <p className="text-sm sm:text-base font-semibold text-gray-900">Tirar Foto</p>
                          <p className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5">Câmera fotográfica</p>
                        </button>

                        {/* Option 2: Short Video (up to 15s) */}
                        <button
                          type="button"
                          onClick={() => videoInputRef.current?.click()}
                          className="border-2 border-dashed border-rose-300 hover:border-[#cb7d87] bg-rose-50/40 hover:bg-rose-50 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center cursor-pointer transition-all group active:scale-[0.98] text-center"
                        >
                          <div className="w-12 h-12 rounded-full bg-rose-100/70 flex items-center justify-center text-[#cb7d87] group-hover:scale-110 transition-transform mb-2">
                            <Video className="w-6 h-6" />
                          </div>
                          <p className="text-sm sm:text-base font-semibold text-gray-900">Gravar Vídeo</p>
                          <p className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5">Clipe até 15s</p>
                        </button>

                        {/* Option 3: Gallery Picker */}
                        <button
                          type="button"
                          onClick={() => galleryInputRef.current?.click()}
                          className="border-2 border-dashed border-gray-200 hover:border-[#cb7d87] bg-gray-50 hover:bg-gray-100 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center cursor-pointer transition-all group active:scale-[0.98] text-center"
                        >
                          <div className="w-12 h-12 rounded-full bg-gray-200/80 flex items-center justify-center text-gray-700 group-hover:scale-110 transition-transform mb-2">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                          <p className="text-sm sm:text-base font-semibold text-gray-900">Galeria</p>
                          <p className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5">Fotos ou vídeos</p>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-black/5">
                          {isVideo ? (
                            <video
                              src={displayPreviewUrl || ""}
                              controls
                              autoPlay
                              playsInline
                              className="w-full max-h-64 object-contain bg-black"
                            />
                          ) : (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={displayPreviewUrl || ""}
                              alt="Pré-visualização"
                              className="w-full max-h-64 object-contain bg-gray-100 transition-all duration-200"
                            />
                          )}
                          <button
                            type="button"
                            onClick={resetForm}
                            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors z-10 cursor-pointer"
                            title="Remover mídia"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          {/* Stats badge */}
                          <div className="bg-gray-900 text-white text-[11px] px-3 py-1.5 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              {isVideo ? (
                                <>
                                  <Video className="w-3.5 h-3.5 text-amber-300" />
                                  <span>Clipe de Vídeo ({Math.round(videoDuration)}s)</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                  {isCompressing
                                    ? "Otimizando foto..."
                                    : useVintagePreset
                                    ? "✨ Visual analógico aplicado"
                                    : "Foto original otimizada"}
                                </>
                              )}
                            </span>
                            {!isCompressing && (activeCompressedSize > 0 || originalFileSize > 0) && (
                              <span className="opacity-90">
                                {isVideo
                                  ? formatBytes(originalFileSize)
                                  : `${formatBytes(originalFileSize)} → ${formatBytes(activeCompressedSize)}`}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Switch / Retake buttons */}
                        <div className="flex items-center justify-center gap-4 text-xs text-gray-500 pt-0.5">
                          <button
                            type="button"
                            onClick={() => (isVideo ? videoInputRef.current?.click() : cameraInputRef.current?.click())}
                            className="inline-flex items-center gap-1 hover:text-[#cb7d87] transition-colors underline underline-offset-2 cursor-pointer"
                          >
                            {isVideo ? <Video className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                            <span>{isVideo ? "Gravar outro vídeo" : "Tirar outra foto"}</span>
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => galleryInputRef.current?.click()}
                            className="inline-flex items-center gap-1 hover:text-[#cb7d87] transition-colors underline underline-offset-2 cursor-pointer"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>Escolher outro</span>
                          </button>
                        </div>

                        {/* Smart Active Moment Badge with collapsible options */}
                        <div className="rounded-2xl bg-[#fffaf5] border border-[#cb7d87]/25 p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-gray-800">
                              <span className="text-base">{moments.find((m) => m.id === selectedMoment)?.icon || "✨"}</span>
                              <span>
                                Momento: <strong className="text-[#cb7d87] font-semibold">{moments.find((m) => m.id === selectedMoment)?.name || "Geral"}</strong>
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowAdvancedOptions((prev) => !prev)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#cb7d87] hover:underline cursor-pointer"
                            >
                              <SlidersHorizontal className="w-3 h-3" />
                              <span>{showAdvancedOptions ? "Menos opções" : "Opções extras"}</span>
                              {showAdvancedOptions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </div>

                          {/* Collapsible advanced options: Vintage Preset & Moment Picker */}
                          {showAdvancedOptions && (
                            <div className="pt-3 mt-2.5 border-t border-[#cb7d87]/15 space-y-3 animate-fade-in">
                              {/* Vintage filter toggle */}
                              {!isVideo && (
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600 font-medium">Estilo da Foto:</span>
                                  <div className="inline-flex items-center p-0.5 bg-white rounded-full border border-gray-200">
                                    <button
                                      type="button"
                                      onClick={() => setUseVintagePreset(true)}
                                      className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all ${
                                        useVintagePreset ? "bg-[#cb7d87] text-white" : "text-gray-600"
                                      }`}
                                    >
                                      ✨ Analógico
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setUseVintagePreset(false)}
                                      className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all ${
                                        !useVintagePreset ? "bg-gray-800 text-white" : "text-gray-600"
                                      }`}
                                    >
                                      Original
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Wedding Moment Selector */}
                              <div>
                                <span className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                                  Alterar Momento:
                                </span>
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                                  {moments.map((m) => {
                                    const isSelected = selectedMoment === m.id;
                                    return (
                                      <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => setSelectedMoment(m.id)}
                                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs whitespace-nowrap border cursor-pointer transition-all ${
                                          isSelected
                                            ? "bg-[#cb7d87] text-white border-[#cb7d87] font-semibold"
                                            : "bg-white text-gray-700 border-gray-200"
                                        }`}
                                      >
                                        <span>{m.icon}</span>
                                        <span>{m.name}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Guest Name input */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                        Seu Nome (opcional)
                      </label>
                      <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Ex: Tio Pedro, Sarah ou Família Silva"
                        maxLength={100}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#cb7d87] focus:ring-1 focus:ring-[#cb7d87] text-sm text-gray-900 placeholder:text-gray-400"
                      />
                    </div>

                    {/* Dedication / Message input */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                        Dedicatória ou Mensagem (opcional)
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Deixe uma mensagem carinhosa para os noivos..."
                        rows={2}
                        maxLength={400}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#cb7d87] focus:ring-1 focus:ring-[#cb7d87] text-sm text-gray-900 placeholder:text-gray-400 resize-none"
                      />
                    </div>

                    {/* Photo Quest Selector */}
                    {quests.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            🎯 Desafio da Festa (opcional)
                          </label>
                          {selectedQuestId && (
                            <button
                              type="button"
                              onClick={() => setSelectedQuestId(null)}
                              className="text-[10px] text-[#cb7d87] hover:underline"
                            >
                              remover desafio
                            </button>
                          )}
                        </div>
                        <select
                          value={selectedQuestId || ""}
                          onChange={(e) => setSelectedQuestId(e.target.value || null)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#cb7d87] text-xs text-gray-900"
                        >
                          <option value="">Nenhum desafio vinculado</option>
                          {quests.map((q) => (
                            <option key={q.id} value={q.id}>
                              {q.icon || "🎯"} {q.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Status messages */}
                    {errorMessage && (
                      <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-xl">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    {/* Progress bar */}
                    {isUploading && (
                      <div className="space-y-1">
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-[#cb7d87] h-full transition-all duration-300 rounded-full"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-center text-gray-500">
                          {isVideo ? "Enviando vídeo para o telão..." : "Enviando foto para o telão..."} {uploadProgress}%
                        </p>
                      </div>
                    )}

                    {/* Submit button */}
                    <button
                      type="submit"
                      disabled={!activeBlob || isCompressing || isUploading}
                      className="w-full flex items-center justify-center gap-2 bg-[#cb7d87] hover:bg-[#b86a76] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 rounded-2xl text-base font-semibold tracking-wide shadow-md transition-all active:scale-[0.99] cursor-pointer"
                    >
                      {isUploading ? (
                        <span>Enviando para o telão...</span>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>{isVideo ? "Enviar Vídeo para o Telão 🎉" : "Enviar para o Telão 🎉"}</span>
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
