"use client";

import React, { useState } from "react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 text-left">
        <h4 className="text-base font-bold text-gray-900">Como podemos te chamar?</h4>
        <p className="text-xs text-gray-500 mt-1">
          Informe seu nome para que os noivos saibam quem comentou!
        </p>
        <input
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="Ex: Tio Pedro ou Sarah"
          autoFocus
          maxLength={60}
          className="w-full px-4 py-2.5 mt-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#cb7d87] text-sm text-gray-900"
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
            className="flex-1 py-2.5 rounded-full bg-[#cb7d87] hover:bg-[#b86a76] text-white text-xs font-semibold disabled:opacity-50"
          >
            Continuar
          </button>
        </div>
      </form>
    </div>
  );
}
