"use client";

import React from "react";

interface DeletePhotoDialogProps {
  isDeleting: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeletePhotoDialog({ isDeleting, error, onConfirm, onCancel }: DeletePhotoDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 text-center">
        <h4 className="text-lg font-bold text-gray-900">Apagar Foto?</h4>
        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
          Esta ação removerá a foto permanentemente da galeria do evento.
        </p>
        {error && <p className="text-xs text-rose-600 mt-2 font-medium">{error}</p>}
        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-full border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-50"
          >
            {isDeleting ? "Apagando..." : "Sim, apagar"}
          </button>
        </div>
      </div>
    </div>
  );
}
