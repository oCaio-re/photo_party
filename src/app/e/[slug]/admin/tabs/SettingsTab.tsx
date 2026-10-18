"use client";

import React, { useState } from "react";
import { ShieldCheck } from "lucide-react";

type ModerationPolicy = "immediate" | "approval_required";

interface SettingsTabProps {
  slug: string;
  hostKey: string;
  isUploadClosed: boolean;
  moderationPolicy: string;
  onSettingsChange: (patch: { isUploadClosed?: boolean; moderationPolicy?: ModerationPolicy }) => void;
}

export function SettingsTab({ slug, hostKey, isUploadClosed, moderationPolicy, onSettingsChange }: SettingsTabProps) {
  const [copiedKey, setCopiedKey] = useState(false);

  const patchSettings = async (patch: { isUploadClosed?: boolean; moderationPolicy?: ModerationPolicy }) => {
    try {
      const res = await fetch(`/api/events/${slug}/settings?key=${hostKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        onSettingsChange(patch);
      }
    } catch (err) {
      console.error("Error updating event settings:", err);
    }
  };

  const handleToggleUploads = (closed: boolean) => patchSettings({ isUploadClosed: closed });
  const handleChangePolicy = (policy: ModerationPolicy) => patchSettings({ moderationPolicy: policy });

  return (
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
          onClick={() => handleToggleUploads(!isUploadClosed)}
          className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors text-center ${
            isUploadClosed
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-red-50 text-red-700 hover:bg-red-100"
          }`}
        >
          {isUploadClosed ? "Reabrir Envios" : "Encerrar Envios"}
        </button>
      </div>

      {/* Moderation policy */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
        <div>
          <p className="text-sm font-semibold text-gray-900">Moderação de Entrada</p>
          <p className="text-xs text-gray-500">Publicar diretamente ou exigir aprovação do Host</p>
        </div>
        <select
          value={moderationPolicy}
          onChange={(e) => handleChangePolicy(e.target.value as ModerationPolicy)}
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
            value={hostKey}
            className="w-full text-xs font-mono bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-gray-800"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(hostKey);
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
  );
}
