"use client";

import React, { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";

interface BundleInfo {
  totalPhotos: number;
  partSize: number;
  totalParts: number;
}

interface BundleTabProps {
  slug: string;
  hostKey: string;
}

/**
 * Photo Bundle export. Large Events are split into several ZIP parts so each
 * download finishes inside the serverless time limit.
 */
export function BundleTab({ slug, hostKey }: BundleTabProps) {
  const [info, setInfo] = useState<BundleInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/events/${slug}/bundle?info&key=${hostKey}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Falha ao consultar o Photo Bundle"))))
      .then((data: BundleInfo) => {
        if (isMounted) setInfo(data);
      })
      .catch((err: unknown) => {
        if (isMounted) setLoadError(err instanceof Error ? err.message : "Erro desconhecido");
      });
    return () => {
      isMounted = false;
    };
  }, [slug, hostKey]);

  const partHref = (part: number) => `/api/events/${slug}/bundle?key=${hostKey}&part=${part}`;

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-8 text-center max-w-xl mx-auto shadow-sm">
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-rose-50 flex items-center justify-center text-[#cb7d87] mx-auto mb-4 ring-4 ring-[#cb7d87]/15">
        <Download className="w-7 h-7 sm:w-8 sm:h-8" />
      </div>

      <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Exportar Photo Bundle (.ZIP)</h3>
      <p className="text-xs text-gray-500 mt-2 mb-6 max-w-md mx-auto leading-relaxed">
        Faça o download de todas as <strong>{info ? info.totalPhotos : "…"} fotos aprovadas</strong> do casamento. As fotos vêm organizadas com o nome da mesa e o autor, acompanhadas de um documento de texto com todas as dedicatórias dos convidados. Perfeito para arquivar nos seus 2TB do <strong>Google Drive</strong>!
      </p>

      {loadError && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl mb-4">{loadError}</p>}

      {!info && !loadError && (
        <div className="flex justify-center text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      )}

      {info && info.totalPhotos === 0 && (
        <p className="text-xs text-gray-500">Nenhuma foto aprovada para exportar ainda.</p>
      )}

      {info && info.totalPhotos > 0 && info.totalParts === 1 && (
        <a
          href={partHref(1)}
          download
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#cb7d87] hover:bg-[#b86a76] text-white px-6 sm:px-8 py-3.5 rounded-2xl font-semibold text-sm shadow-md shadow-[#cb7d87]/25 transition-all active:scale-95 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Baixar Todas as Fotos (.ZIP)</span>
        </a>
      )}

      {info && info.totalParts > 1 && (
        <div className="space-y-2">
          <p className="text-[11px] text-gray-500 mb-3">
            São muitas fotos! O arquivo foi dividido em {info.totalParts} partes de até {info.partSize} fotos. Baixe uma de cada vez.
          </p>
          {Array.from({ length: info.totalParts }, (_, i) => i + 1).map((part) => {
            const first = (part - 1) * info.partSize + 1;
            const last = Math.min(part * info.partSize, info.totalPhotos);
            return (
              <a
                key={part}
                href={partHref(part)}
                download
                className="w-full flex items-center justify-between gap-2 bg-rose-50 hover:bg-rose-100 text-[#832d3b] px-4 py-3 rounded-2xl font-semibold text-xs transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#cb7d87]" />
                  Parte {part} de {info.totalParts}
                  {part === 1 && <span className="font-normal text-gray-500">(inclui dedicatórias)</span>}
                </span>
                <span className="font-normal text-gray-500">
                  fotos {first}–{last}
                </span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
