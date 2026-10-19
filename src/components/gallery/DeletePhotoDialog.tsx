"use client";

import React from "react";
import { Dialog } from "@/components/ui/Dialog";

interface DeletePhotoDialogProps {
  isDeleting: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeletePhotoDialog({ isDeleting, error, onConfirm, onCancel }: DeletePhotoDialogProps) {
  return (
    <Dialog
      onRequestClose={() => {
        if (!isDeleting) onCancel();
      }}
      labelledBy="delete-photo-title"
      className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 text-center"
    >
      <h4 id="delete-photo-title" className="text-lg font-bold text-gray-900">
        Apagar esta foto?
      </h4>
      <p className="text-sm text-gray-600 mt-2 leading-relaxed">
        Ela sai da galeria e do telão para todos. Não dá para desfazer.
      </p>
      {error && (
        <p role="alert" className="text-sm text-rose-700 mt-3 font-medium">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3 mt-5">
        <button
          type="button"
          data-autofocus
          onClick={onCancel}
          className="flex-1 py-3 rounded-full border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50"
        >
          Manter foto
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isDeleting}
          className="flex-1 py-3 rounded-full bg-rose-700 hover:bg-rose-800 text-white text-sm font-semibold disabled:opacity-60"
        >
          {isDeleting ? "Apagando…" : "Apagar"}
        </button>
      </div>
    </Dialog>
  );
}
