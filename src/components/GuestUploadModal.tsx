"use client";

import React, { useState, useRef, useEffect } from "react";
import { Camera, ImageIcon, X, Send, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { compressImage } from "@/lib/client-compress";

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);

  const [guestName, setGuestName] = useState("");
  const [message, setMessage] = useState("");

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
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URL on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    e.target.value = "";
    if (!selectedFile) return;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setFile(selectedFile);
    setOriginalSize(selectedFile.size);

    // Create local object URL for preview and open modal
    const preview = URL.createObjectURL(selectedFile);
    setPreviewUrl(preview);
    setIsOpen(true);

    try {
      setIsCompressing(true);
      const { blob } = await compressImage(selectedFile);
      setCompressedBlob(blob);
      setCompressedSize(blob.size);
    } catch (err) {
      console.warn("Client compression failed, using original file:", err);
      setCompressedBlob(selectedFile);
      setCompressedSize(selectedFile.size);
    } finally {
      setIsCompressing(false);
    }
  };

  const resetForm = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    setCompressedBlob(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    setUploadProgress(0);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compressedBlob) {
      setErrorMessage("Por favor, selecione uma foto.");
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
      formData.append("file", compressedBlob, file?.name || "photo.webp");
      formData.append("guestSessionId", sId);
      if (tableId) formData.append("tableId", tableId);
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
        throw new Error(data.error || "Erro ao enviar a foto");
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

      {/* Hidden Gallery Input (opens gallery / photo library) */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Escolher foto da galeria"
      />

      {/* Elegant Floating / Main Action Buttons */}
      <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center items-center gap-2.5 px-4 pointer-events-none">
        {/* Primary Action: Tirar Foto (Direct Camera) */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="pointer-events-auto flex items-center gap-2.5 bg-[#cb7d87] hover:bg-[#b86a76] active:scale-95 text-[#fffaf5] px-5 sm:px-6 py-3.5 rounded-full shadow-[0_10px_25px_rgba(203,125,135,0.45)] transition-all duration-200 border border-[#fffaf5]/40 font-serif text-base sm:text-lg tracking-wide"
        >
          <Camera className="w-5 h-5 text-[#ebca90]" />
          <span>Tirar Foto</span>
          {tableName && (
            <span className="text-xs bg-[#5a6248] text-[#fbead6] px-2 py-0.5 rounded-full font-sans tracking-normal ml-0.5">
              {tableName}
            </span>
          )}
        </button>

        {/* Secondary Action: Galeria (Choose from files / gallery) */}
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className="pointer-events-auto flex items-center gap-2 bg-[#5a6248] hover:bg-[#49503b] active:scale-95 text-[#fbead6] px-4 sm:px-5 py-3.5 rounded-full shadow-[0_10px_25px_rgba(90,98,72,0.35)] transition-all duration-200 border border-[#fffaf5]/30 font-serif text-base tracking-wide"
          title="Escolher foto já tirada da galeria"
        >
          <ImageIcon className="w-5 h-5 text-[#ebca90]" />
          <span>Galeria</span>
        </button>
      </div>

      {/* Upload Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#49503b]/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#fffaf5] border border-[#cb7d87]/30 rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl p-6 relative text-[#49503b]">
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
              {/* Image Picker / Preview Area */}
              {!previewUrl ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Live Camera */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="border-2 border-dashed border-[#cb7d87]/50 hover:border-[#cb7d87] bg-[#fbead6]/30 hover:bg-[#fbead6]/60 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all group active:scale-[0.98] text-center"
                  >
                    <div className="w-14 h-14 rounded-full bg-[#cb7d87]/15 flex items-center justify-center text-[#cb7d87] group-hover:scale-110 transition-transform mb-2">
                      <Camera className="w-7 h-7" />
                    </div>
                    <p className="font-serif text-base font-semibold text-[#5a6248]">Tirar Foto</p>
                    <p className="text-[11px] text-[#7c8764] mt-1">Abre a câmera do celular</p>
                  </button>

                  {/* Option 2: Gallery Picker */}
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="border-2 border-dashed border-[#5a6248]/40 hover:border-[#5a6248] bg-[#fbead6]/30 hover:bg-[#fbead6]/60 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all group active:scale-[0.98] text-center"
                  >
                    <div className="w-14 h-14 rounded-full bg-[#5a6248]/15 flex items-center justify-center text-[#5a6248] group-hover:scale-110 transition-transform mb-2">
                      <ImageIcon className="w-7 h-7" />
                    </div>
                    <p className="font-serif text-base font-semibold text-[#5a6248]">Escolher da Galeria</p>
                    <p className="text-[11px] text-[#7c8764] mt-1">Fotos salvas no aparelho</p>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative rounded-2xl overflow-hidden border border-[#cb7d87]/20 bg-black/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="Pré-visualização" className="w-full max-h-64 object-contain bg-[#fbead6]/20" />
                    <button
                      type="button"
                      onClick={resetForm}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                      title="Remover foto"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    {/* Compression stats badge */}
                    <div className="bg-[#5a6248] text-[#fbead6] text-[11px] px-3 py-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#ebca90]" />
                        {isCompressing ? "Otimizando foto..." : "Otimizada para envio rápido"}
                      </span>
                      {!isCompressing && compressedSize > 0 && (
                        <span className="opacity-90">
                          {formatBytes(originalSize)} → <strong>{formatBytes(compressedSize)}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Switch / Retake buttons */}
                  <div className="flex items-center justify-center gap-4 text-xs text-[#7c8764] pt-1">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="inline-flex items-center gap-1 hover:text-[#cb7d87] transition-colors underline underline-offset-2"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Tirar outra foto</span>
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="inline-flex items-center gap-1 hover:text-[#cb7d87] transition-colors underline underline-offset-2"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Escolher da galeria</span>
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
                  <p className="text-[11px] text-center text-[#7c8764]">Enviando foto... {uploadProgress}%</p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={!compressedBlob || isCompressing || isUploading}
                className="w-full flex items-center justify-center gap-2 bg-[#cb7d87] hover:bg-[#b86a76] disabled:opacity-50 disabled:cursor-not-allowed text-[#fffaf5] py-3 rounded-2xl font-serif text-lg tracking-wide shadow-md transition-all active:scale-[0.99]"
              >
                {isUploading ? (
                  <span>Publicando...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Publicar Foto</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
