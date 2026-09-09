"use client";

import React, { useState, useRef, useEffect } from "react";
import { Camera, ImageIcon, X, Send, Sparkles, CheckCircle2, AlertCircle, HelpCircle, Video } from "lucide-react";
import { compressImage } from "@/lib/client-compress";
import { openHowItWorksGuide } from "@/components/HowItWorksModal";

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
}

export function GuestUploadModal({
  slug,
  tableId,
  tableName,
  onUploadComplete,
  isUploadClosed = false,
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

      setTimeout(() => {
        resetForm();
        setIsOpen(false);
      }, 1800);
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
    return (
      <div className="bg-[#fffaf5] border border-[#cb7d87]/30 text-[#832d3b] rounded-2xl p-4 text-center max-w-md mx-auto shadow-sm">
        <p className="font-serif text-lg font-medium">Envios Encerrados</p>
        <p className="text-xs text-[#5a6248] mt-1">
          O anfitrião encerrou novos envios. Você ainda pode baixar e ver todas as fotos na galeria abaixo!
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Hidden Camera Input (forces camera viewfinder on mobile) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Tirar foto com a câmera"
      />

      {/* Hidden Video Input (forces video camera on mobile, up to 15s) */}
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

      {/* Elegant Floating / Main Action Buttons */}
      <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center items-center gap-2 px-3 sm:gap-2.5 sm:px-4 pointer-events-none">
        {/* Primary Action: Tirar Foto (Direct Camera) */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="pointer-events-auto flex items-center gap-2 bg-[#cb7d87] hover:bg-[#b86a76] active:scale-95 text-[#fffaf5] px-4 sm:px-5 py-3.5 rounded-full shadow-[0_10px_25px_rgba(203,125,135,0.45)] transition-all duration-200 border border-[#fffaf5]/40 font-serif text-sm sm:text-base tracking-wide cursor-pointer"
        >
          <Camera className="w-5 h-5 text-[#ebca90]" />
          <span>Tirar Foto</span>
          {tableName && (
            <span className="text-[11px] bg-[#5a6248] text-[#fbead6] px-2 py-0.5 rounded-full font-sans tracking-normal ml-0.5">
              {tableName}
            </span>
          )}
        </button>

        {/* Video Action: Gravar Vídeo (até 15s) */}
        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          className="pointer-events-auto flex items-center gap-1.5 bg-[#832d3b] hover:bg-[#722633] active:scale-95 text-[#fffaf5] px-3.5 sm:px-4 py-3.5 rounded-full shadow-[0_10px_25px_rgba(131,45,59,0.35)] transition-all duration-200 border border-[#fffaf5]/30 font-serif text-sm sm:text-base tracking-wide cursor-pointer"
          title="Gravar vídeo curto (até 15s)"
        >
          <Video className="w-4 h-4 text-[#ebca90]" />
          <span className="hidden xs:inline">Vídeo (15s)</span>
        </button>

        {/* Secondary Action: Galeria (Choose from files / gallery) */}
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className="pointer-events-auto flex items-center gap-1.5 bg-[#5a6248] hover:bg-[#49503b] active:scale-95 text-[#fbead6] px-3.5 sm:px-4 py-3.5 rounded-full shadow-[0_10px_25px_rgba(90,98,72,0.35)] transition-all duration-200 border border-[#fffaf5]/30 font-serif text-sm sm:text-base tracking-wide cursor-pointer"
          title="Escolher foto ou vídeo salvo no aparelho"
        >
          <ImageIcon className="w-4 h-4 text-[#ebca90]" />
          <span className="hidden sm:inline">Galeria</span>
        </button>

        {/* Help / How It Works Button */}
        <button
          type="button"
          onClick={openHowItWorksGuide}
          className="pointer-events-auto flex items-center justify-center w-12 h-12 bg-[#fffaf5] hover:bg-[#fbead6] active:scale-95 text-[#5a6248] hover:text-[#cb7d87] rounded-full shadow-[0_6px_20px_rgba(90,98,72,0.22)] transition-all duration-200 border border-[#cb7d87]/35"
          title="Como funciona a plataforma?"
          aria-label="Como funciona?"
        >
          <HelpCircle className="w-6 h-6 text-[#cb7d87]" />
        </button>
      </div>

      {/* Upload Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[#49503b]/60 backdrop-blur-sm overscroll-contain animate-fade-in"
          style={{ WebkitOverflowScrolling: "touch" }}
          onClick={() => {
            resetForm();
            setIsOpen(false);
          }}
        >
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#fffaf5] border border-[#cb7d87]/30 rounded-3xl max-w-lg w-full shadow-2xl p-6 relative text-[#49503b] my-8 text-left"
            >
            <button
              onClick={() => {
                resetForm();
                setIsOpen(false);
              }}
              className="absolute top-4 right-4 p-2 text-[#5a6248] hover:text-[#cb7d87] hover:bg-[#fbead6] rounded-full transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-5">
              <span className="text-xs uppercase tracking-[0.2em] text-[#cb7d87] font-semibold">Recordações ao Vivo</span>
              <h3 className="font-serif text-2xl text-[#5a6248] mt-1">Compartilhe um Momento</h3>
              {tableName && (
                <p className="text-xs text-[#7c8764] mt-0.5">
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
                    className="border-2 border-dashed border-[#cb7d87]/50 hover:border-[#cb7d87] bg-[#fbead6]/30 hover:bg-[#fbead6]/60 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center cursor-pointer transition-all group active:scale-[0.98] text-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#cb7d87]/15 flex items-center justify-center text-[#cb7d87] group-hover:scale-110 transition-transform mb-2">
                      <Camera className="w-6 h-6" />
                    </div>
                    <p className="font-serif text-sm sm:text-base font-semibold text-[#5a6248]">Tirar Foto</p>
                    <p className="text-[10px] sm:text-[11px] text-[#7c8764] mt-0.5">Câmera fotográfica</p>
                  </button>

                  {/* Option 2: Short Video (up to 15s) */}
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="border-2 border-dashed border-[#832d3b]/45 hover:border-[#832d3b] bg-[#fbead6]/30 hover:bg-[#fbead6]/60 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center cursor-pointer transition-all group active:scale-[0.98] text-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#832d3b]/15 flex items-center justify-center text-[#832d3b] group-hover:scale-110 transition-transform mb-2">
                      <Video className="w-6 h-6" />
                    </div>
                    <p className="font-serif text-sm sm:text-base font-semibold text-[#832d3b]">Gravar Vídeo</p>
                    <p className="text-[10px] sm:text-[11px] text-[#7c8764] mt-0.5">Clipe até 15s</p>
                  </button>

                  {/* Option 3: Gallery Picker */}
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="border-2 border-dashed border-[#5a6248]/40 hover:border-[#5a6248] bg-[#fbead6]/30 hover:bg-[#fbead6]/60 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center cursor-pointer transition-all group active:scale-[0.98] text-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#5a6248]/15 flex items-center justify-center text-[#5a6248] group-hover:scale-110 transition-transform mb-2">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <p className="font-serif text-sm sm:text-base font-semibold text-[#5a6248]">Galeria</p>
                    <p className="text-[10px] sm:text-[11px] text-[#7c8764] mt-0.5">Fotos ou vídeos</p>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="relative rounded-2xl overflow-hidden border border-[#cb7d87]/20 bg-black/5">
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
                        className="w-full max-h-64 object-contain bg-[#fbead6]/20 transition-all duration-200"
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
                    <div className="bg-[#5a6248] text-[#fbead6] text-[11px] px-3 py-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        {isVideo ? (
                          <>
                            <Video className="w-3.5 h-3.5 text-[#ebca90]" />
                            <span>Clipe de Vídeo ({Math.round(videoDuration)}s)</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-[#ebca90]" />
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

                  {/* Vintage Film Preset Toggle Pill (photos only) */}
                  {!isVideo && (
                    <div className="flex items-center justify-center pt-0.5">
                      <div className="inline-flex items-center p-1 bg-[#fbead6]/80 rounded-full border border-[#cb7d87]/30 shadow-xs">
                        <button
                          type="button"
                          onClick={() => setUseVintagePreset(true)}
                          className={`flex items-center gap-1.5 py-1 px-3.5 rounded-full text-xs font-serif tracking-wide transition-all cursor-pointer ${
                            useVintagePreset
                              ? "bg-[#cb7d87] text-[#fffaf5] shadow-xs font-semibold"
                              : "text-[#5a6248] hover:text-[#cb7d87]"
                          }`}
                        >
                          <Sparkles className={`w-3.5 h-3.5 ${useVintagePreset ? "text-[#ebca90]" : "text-[#cb7d87]"}`} />
                          <span>✨ Analógico Vintage</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setUseVintagePreset(false)}
                          className={`flex items-center gap-1.5 py-1 px-3.5 rounded-full text-xs font-serif tracking-wide transition-all cursor-pointer ${
                            !useVintagePreset
                              ? "bg-[#5a6248] text-[#fbead6] shadow-xs font-semibold"
                              : "text-[#5a6248] hover:text-[#cb7d87]"
                          }`}
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Original</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Switch / Retake buttons */}
                  <div className="flex items-center justify-center gap-4 text-xs text-[#7c8764] pt-0.5">
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
                      <span>Escolher outro da galeria</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Guest Name input */}
              <div>
                <label className="block text-xs font-semibold text-[#5a6248] mb-1 uppercase tracking-wider">
                  Seu Nome (opcional)
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Ex: Tio Pedro ou Sarah"
                  maxLength={100}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#cb7d87]/30 bg-white focus:outline-none focus:border-[#cb7d87] focus:ring-1 focus:ring-[#cb7d87] text-sm text-[#49503b] placeholder:text-gray-400"
                />
              </div>

              {/* Dedication / Message input */}
              <div>
                <label className="block text-xs font-semibold text-[#5a6248] mb-1 uppercase tracking-wider">
                  Dedicatória ou Mensagem (opcional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Deixe uma mensagem para os anfitriões..."
                  rows={2}
                  maxLength={400}
                  className="w-full px-4 py-2 rounded-xl border border-[#cb7d87]/30 bg-white focus:outline-none focus:border-[#cb7d87] focus:ring-1 focus:ring-[#cb7d87] text-sm text-[#49503b] placeholder:text-gray-400 resize-none"
                />
              </div>

              {/* Photo Quest Selector */}
              {quests.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#5a6248] uppercase tracking-wider">
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#cb7d87]/30 bg-white focus:outline-none focus:border-[#cb7d87] text-xs text-[#49503b]"
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

              {successMessage && (
                <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Progress bar */}
              {isUploading && (
                <div className="space-y-1">
                  <div className="w-full bg-[#fbead6] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#cb7d87] h-full transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-center text-[#7c8764]">
                    {isVideo ? "Enviando vídeo..." : "Enviando foto..."} {uploadProgress}%
                  </p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={!activeBlob || isCompressing || isUploading}
                className="w-full flex items-center justify-center gap-2 bg-[#cb7d87] hover:bg-[#b86a76] disabled:opacity-50 disabled:cursor-not-allowed text-[#fffaf5] py-3 rounded-2xl font-serif text-lg tracking-wide shadow-md transition-all active:scale-[0.99] cursor-pointer"
              >
                {isUploading ? (
                  <span>Publicando...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{isVideo ? "Publicar Clipe de Vídeo" : "Publicar Foto"}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
      )}
    </>
  );
}
