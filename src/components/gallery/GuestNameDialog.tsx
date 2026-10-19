"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";

interface GuestNameDialogProps {
  initialName: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}

export function GuestNameDialog({ initialName, onSave, onCancel }: GuestNameDialogProps) {
  const [nameInput, setNameInput] = useState(initialName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nameInput.trim();
    if (clean) onSave(clean);
  };

  return (
    <Dialog
      onRequestClose={onCancel}
      labelledBy="guest-name-title"
      className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 text-left"
    >
      <form onSubmit={handleSubmit}>
        <h4 id="guest-name-title" className="text-base font-bold text-gray-900">Como podemos te chamar?</h4>
        <p id="guest-name-hint" className="text-sm text-gray-600 mt-1">
          Seu nome aparece junto do comentário, para os noivos saberem quem escreveu.
        </p>
        <label htmlFor="guest-name-input" className="sr-only">
          Seu nome
        </label>
        <input
          id="guest-name-input"
          data-autofocus
          aria-describedby="guest-name-hint"
          autoComplete="name"
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="Ex: Tio Pedro ou Sarah"
          maxLength={60}
          className="w-full px-4 py-2.5 mt-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#cb7d87] text-base sm:text-sm text-gray-900 placeholder:text-gray-500"
        />
        <div className="flex items-center gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-full border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!nameInput.trim()}
            className="flex-1 py-2.5 rounded-full bg-marsala-ink hover:bg-marsala-ink-hover text-white text-xs font-semibold disabled:opacity-50"
          >
            Continuar
          </button>
        </div>
      </form>
    </Dialog>
  );
}
