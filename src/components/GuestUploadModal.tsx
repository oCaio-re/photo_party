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
import { Dialog } from "@/components/ui/Dialog";
import { uploadMedia } from "@/lib/client-upload";
import { ensureGuestSessionId, rememberMyPhoto, useGuestIdentity } from "@/hooks/useGuestIdentity";
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

  // Raw original processed version
  const [rawBlob, setRawBlob] = useState<Blob | null>(null);
  const [rawPreviewUrl, setRawPreviewUrl] = useState<string | null>(null);

  const displayPreviewUrl =
    (useVintagePreset ? vintagePreviewUrl : rawPreviewUrl) || initialPreviewUrl;
  const activeBlob = useVintagePreset ? (vintageBlob || rawBlob) : (rawBlob || vintageBlob);

  // Name typed in this form; until edited, it shows the name remembered on this device
  const { guestName: savedGuestName, setGuestName: saveGuestName } = useGuestIdentity();
  const [guestNameDraft, setGuestNameDraft] = useState<string | null>(null);
  const guestName = guestNameDraft ?? savedGuestName;
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
        // With uploads closed the inputs are not rendered: open the notice instead
        if (cameraInputRef.current) cameraInputRef.current.click();
        else setIsOpen(true);
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

  // Revoke superseded object URLs (and the current ones on unmount)
  useEffect(() => {
    return () => {
      if (initialPreviewUrl) URL.revokeObjectURL(initialPreviewUrl);
      if (vintagePreviewUrl) URL.revokeObjectURL(vintagePreviewUrl);
      if (rawPreviewUrl) URL.revokeObjectURL(rawPreviewUrl);
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
        setVintagePreviewUrl(initUrl);
        setRawPreviewUrl(initUrl);
        return;
      } catch {
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

      setRawBlob(rawResult.blob);
      setRawPreviewUrl(rUrl);
    } catch (err) {
      console.warn("Client compression failed, using original file:", err);
      setVintageBlob(selectedFile);
      setVintagePreviewUrl(initUrl);
      setRawBlob(selectedFile);
      setRawPreviewUrl(initUrl);
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
    setRawBlob(null);
    setRawPreviewUrl(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    setUploadProgress(0);
    setSelectedQuestId(null);
    setShowAdvancedOptions(false);
    // File inputs need no reset: handleFileChange clears their value on every pick
  };

  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);

  // Something the Guest would lose by closing (their name is remembered separately)
  const hasDraft = Boolean(file) || message.trim() !== "";

  const closeModal = () => {
    resetForm();
    setMessage("");
    setConfirmDiscard(false);
    setPendingApproval(false);
    setIsOpen(false);
  };

  // Backdrop taps, Escape and the X never destroy an upload in progress or an unsent draft
  const requestClose = () => {
    if (isUploading) return;
    if (!successMessage && hasDraft) {
      setConfirmDiscard(true);
      return;
    }
    closeModal();
  };

  // Leaving the page mid-upload would abort it: let the browser ask first
  useEffect(() => {
    if (!isUploading) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isUploading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBlob) {
      setErrorMessage("Por favor, selecione uma foto ou clipe de vídeo.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(5);
      setErrorMessage(null);

      const sId = ensureGuestSessionId();
      if (guestName.trim()) {
        saveGuestName(guestName.trim());
      }

      const data = await uploadMedia({
        slug,
        blob: activeBlob,
        filename: file?.name || (isVideo ? "clip.mp4" : "photo.webp"),
        guestSessionId: sId,
        fields: {
          tableId,
          questId: selectedQuestId,
          moment: selectedMoment,
          guestName: guestName.trim(),
          message: message.trim(),
        },
        onProgress: (fraction) => setUploadProgress(Math.max(5, Math.round(fraction * 95))),
      });

      // Record uploaded photo ID for instant local ownership tracking
      if (data.photo?.id) {
        rememberMyPhoto(data.photo.id);
      }

      setUploadProgress(100);
      setPendingApproval(data.photo?.status === "pending");
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

  if (isUploadClosed) {
    // Buttons elsewhere (moments, quests) still fire the open event; answer them instead of doing nothing
    return isOpen ? (
      <Dialog
        onRequestClose={() => setIsOpen(false)}
        labelledBy="uploads-closed-title"
        className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center"
      >
        <h3 id="uploads-closed-title" className="text-lg font-bold text-gray-900">
          Os envios foram encerrados
        </h3>
        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
          Os noivos já fecharam o álbum para novas fotos. Você ainda pode ver, curtir e salvar todas as fotos da festa.
        </p>
        <button
          type="button"
          data-autofocus
          onClick={() => setIsOpen(false)}
          className="mt-5 w-full py-3 rounded-2xl bg-marsala-ink hover:bg-marsala-ink-hover text-white text-sm font-semibold"
        >
          Ver as fotos
        </button>
      </Dialog>
    ) : null;
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
            className="pointer-events-auto flex items-center gap-2 bg-marsala-ink hover:bg-marsala-ink-hover active:scale-95 text-white px-7 py-3.5 rounded-full shadow-[0_10px_25px_rgba(203,125,135,0.45)] transition-all duration-200 font-semibold text-sm sm:text-base tracking-wide cursor-pointer border border-white/20"
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

      {/* Upload sheet */}
      {isOpen && (
        <Dialog
          onRequestClose={requestClose}
          labelledBy="upload-dialog-title"
          variant="sheet"
          className="bg-white max-w-lg shadow-2xl text-gray-900 text-left max-h-[92dvh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-3">
            <div>
              <h3 id="upload-dialog-title" className="text-xl font-bold text-gray-900">
                {successMessage ? (pendingApproval ? "Recebemos sua foto!" : "Sua foto já está no telão!") : "Compartilhe um momento"}
              </h3>
              {!successMessage && tableName && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Enviando da <strong className="text-marsala-ink">{tableName}</strong>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={requestClose}
              aria-disabled={isUploading}
              className={`-mr-2 p-2.5 rounded-full transition-colors ${
                isUploading ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              }`}
              aria-label={isUploading ? "Aguarde o envio terminar para fechar" : "Fechar"}
              title={isUploading ? "Aguarde o envio terminar" : "Fechar"}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {successMessage ? (
            <div className="px-6 pb-6 text-center space-y-4 overflow-y-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <p className="text-sm text-gray-600 max-w-xs mx-auto leading-relaxed">
                {pendingApproval
                  ? "Ela aparece na galeria e no telão assim que os noivos aprovarem. Obrigado por celebrar com a gente!"
                  : "Obrigado por celebrar com os noivos e deixar essa lembrança inesquecível. 🥂"}
              </p>

              <div className="pt-2 space-y-3 max-w-xs mx-auto">
                {!pendingApproval && (
                  <button
                    type="button"
                    data-autofocus
                    onClick={() => {
                      closeModal();
                      window.dispatchEvent(new CustomEvent("photo_party_switch_tab", { detail: { tab: "gallery" } }));
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-marsala-ink hover:bg-marsala-ink-hover active:scale-95 text-white font-semibold text-sm py-3.5 px-5 rounded-2xl shadow-md transition-all cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Ver minha foto na galeria</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setMessage("");
                    cameraInputRef.current?.click();
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-800 font-semibold text-sm py-3 px-5 rounded-2xl transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Tirar mais uma foto</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
              {/* Scrollable body */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pb-4 space-y-4">
                {/* Image / Video Picker / Preview Area */}
                {!displayPreviewUrl ? (
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { label: "Tirar foto", hint: "Câmera", icon: Camera, input: cameraInputRef },
                      { label: "Gravar vídeo", hint: "Até 15s", icon: Video, input: videoInputRef },
                      { label: "Galeria", hint: "Fotos ou vídeos", icon: ImageIcon, input: galleryInputRef },
                    ].map(({ label, hint, icon: Icon, input }, idx) => (
                      <button
                        key={label}
                        type="button"
                        data-autofocus={idx === 0 ? true : undefined}
                        onClick={() => input.current?.click()}
                        className="border-2 border-dashed border-[#cb7d87]/40 hover:border-[#cb7d87] bg-rose-50/40 hover:bg-rose-50 rounded-2xl px-2 py-4 flex flex-col items-center justify-center cursor-pointer transition-all group active:scale-[0.98] text-center"
                      >
                        <span className="w-11 h-11 rounded-full bg-rose-100/70 flex items-center justify-center text-marsala-ink group-hover:scale-110 transition-transform mb-1.5">
                          <Icon className="w-5 h-5" aria-hidden="true" />
                        </span>
                        <span className="text-sm font-semibold text-gray-900 leading-tight">{label}</span>
                        <span className="text-[11px] text-gray-500 mt-0.5">{hint}</span>
                      </button>
                    ))}
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
                        className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors z-10 cursor-pointer"
                        title="Remover mídia"
                        aria-label="Remover foto ou vídeo escolhido"
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
                                ? "Visual analógico aplicado"
                                : "Foto original"}
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Switch / Retake buttons */}
                    <div className="flex items-center justify-center gap-4 text-xs text-gray-500 pt-0.5">
                      <button
                        type="button"
                        onClick={() => (isVideo ? videoInputRef.current?.click() : cameraInputRef.current?.click())}
                        className="inline-flex items-center gap-1 hover:text-marsala-ink transition-colors underline underline-offset-2 cursor-pointer"
                      >
                        {isVideo ? <Video className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                        <span>{isVideo ? "Gravar outro vídeo" : "Tirar outra foto"}</span>
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="inline-flex items-center gap-1 hover:text-marsala-ink transition-colors underline underline-offset-2 cursor-pointer"
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
                            Momento: <strong className="text-marsala-ink font-semibold">{moments.find((m) => m.id === selectedMoment)?.name || "Geral"}</strong>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAdvancedOptions((prev) => !prev)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-marsala-ink hover:underline cursor-pointer"
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
                                    useVintagePreset ? "bg-marsala-ink text-white" : "text-gray-600"
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
                                        ? "bg-marsala-ink text-white border-[#cb7d87] font-semibold"
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
                  <label htmlFor="upload-guest-name" className="block text-xs font-semibold text-gray-700 mb-1">
                    Seu nome <span className="font-normal text-gray-500">(opcional)</span>
                  </label>
                  <input
                    id="upload-guest-name"
                    type="text"
                    autoComplete="name"
                    value={guestName}
                    onChange={(e) => setGuestNameDraft(e.target.value)}
                    placeholder="Ex: Tio Pedro, Sarah ou Família Silva"
                    maxLength={100}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#cb7d87] focus:ring-1 focus:ring-marsala-ink text-base sm:text-sm text-gray-900 placeholder:text-gray-500"
                  />
                </div>

                {/* Dedication / Message input */}
                <div>
                  <label htmlFor="upload-message" className="block text-xs font-semibold text-gray-700 mb-1">
                    Dedicatória para os noivos <span className="font-normal text-gray-500">(opcional)</span>
                  </label>
                  <textarea
                    id="upload-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Deixe uma mensagem carinhosa..."
                    rows={2}
                    maxLength={400}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#cb7d87] focus:ring-1 focus:ring-marsala-ink text-base sm:text-sm text-gray-900 placeholder:text-gray-500 resize-none"
                  />
                </div>

                {/* Photo Quest Selector */}
                {quests.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="upload-quest" className="block text-xs font-semibold text-gray-700">
                        Desafio da festa <span className="font-normal text-gray-500">(opcional)</span>
                      </label>
                      {selectedQuestId && (
                        <button
                          type="button"
                          onClick={() => setSelectedQuestId(null)}
                          className="text-xs text-marsala-ink hover:underline py-1"
                        >
                          Remover desafio
                        </button>
                      )}
                    </div>
                    <select
                      id="upload-quest"
                      value={selectedQuestId || ""}
                      onChange={(e) => setSelectedQuestId(e.target.value || null)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#cb7d87] text-base sm:text-sm text-gray-900"
                    >
                      <option value="">Nenhum desafio</option>
                      {quests.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.icon || "🎯"} {q.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Sticky footer: always within thumb reach */}
              <div className="border-t border-gray-100 bg-white px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2.5 rounded-b-3xl">
                {confirmDiscard ? (
                  <div role="alertdialog" aria-labelledby="discard-title" className="space-y-2.5">
                    <p id="discard-title" className="text-sm font-semibold text-gray-900 text-center">
                      Descartar foto e dedicatória?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        data-autofocus
                        onClick={() => setConfirmDiscard(false)}
                        className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-800 hover:bg-gray-50 cursor-pointer"
                      >
                        Continuar editando
                      </button>
                      <button
                        type="button"
                        onClick={closeModal}
                        className="flex-1 py-3 rounded-2xl bg-rose-700 hover:bg-rose-800 text-white text-sm font-semibold cursor-pointer"
                      >
                        Descartar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {errorMessage && (
                      <div role="alert" className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-xl">
                        <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    {isUploading && (
                      <div className="space-y-1" aria-live="polite">
                        <div
                          className="w-full bg-gray-100 rounded-full h-2 overflow-hidden"
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={uploadProgress}
                          aria-label="Progresso do envio"
                        >
                          <div
                            className="bg-marsala-ink h-full transition-all duration-300 rounded-full"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-center text-gray-600">
                          {isVideo ? "Enviando vídeo" : "Enviando foto"}… {uploadProgress}% · não feche esta tela
                        </p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={!activeBlob || isCompressing || isUploading}
                      className="w-full flex items-center justify-center gap-2 bg-marsala-ink hover:bg-marsala-ink-hover disabled:bg-gray-200 disabled:text-gray-500 disabled:shadow-none disabled:cursor-not-allowed text-white py-3.5 rounded-2xl text-base font-semibold tracking-wide shadow-md transition-all active:scale-[0.99] cursor-pointer"
                    >
                      {isUploading ? (
                        <span>Enviando…</span>
                      ) : !activeBlob ? (
                        <span>Escolha uma foto ou vídeo</span>
                      ) : (
                        <>
                          <Send className="w-4 h-4" aria-hidden="true" />
                          <span>{isVideo ? "Enviar vídeo para o telão" : "Enviar para o telão"}</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </form>
          )}
        </Dialog>
      )}
    </>
  );
}
