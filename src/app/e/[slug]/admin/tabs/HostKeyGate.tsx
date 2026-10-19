"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Key } from "lucide-react";

interface HostKeyGateProps {
  slug: string;
  hostKey: string;
  initialKey: string;
  onAuthorized: () => void;
}

/** Fallback unlock prompt when someone opens the admin route without a session. */
export function HostKeyGate({ slug, hostKey, initialKey, onAuthorized }: HostKeyGateProps) {
  const [keyInput, setKeyInput] = useState(initialKey);
  const [authError, setAuthError] = useState("");

  const handleAuthorize = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyInput.trim() === hostKey) {
      setAuthError("");
      window.history.replaceState(null, "", `${window.location.pathname}?key=${keyInput.trim()}`);
      onAuthorized();
    } else {
      setAuthError("Chave de Host incorreta. Verifique a chave fornecida.");
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="bg-white border border-gray-100 rounded-3xl p-8 max-w-md w-full shadow-xl text-center">
        <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-marsala-ink mx-auto mb-4 ring-4 ring-[#cb7d87]/15">
          <Key className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Acesso de Anfitrião</h2>
        <p className="text-xs text-gray-500 mt-1 mb-6">
          Introduza a sua <strong>Host Key</strong> para desbloquear a administração.
        </p>

        <form onSubmit={handleAuthorize} className="space-y-4">
          <input
            type="text"
            required
            placeholder="Introduza a sua Host Key (ex: amor2026)"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-marsala-ink text-center font-mono text-sm text-gray-900"
          />

          {authError && (
            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl">{authError}</p>
          )}

          <button
            type="submit"
            className="w-full bg-marsala-ink hover:bg-marsala-ink-hover text-white py-3 rounded-2xl font-semibold text-sm shadow-md shadow-[#cb7d87]/25 cursor-pointer transition-all"
          >
            Desbloquear Painel
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center gap-4 text-xs">
          <Link href="/" className="text-marsala-ink font-semibold hover:underline">
            Fazer Login Normal
          </Link>
          <span className="text-gray-300">•</span>
          <Link href={`/e/${slug}`} className="text-gray-500 hover:text-gray-700">
            Galeria Pública
          </Link>
        </div>
      </div>
    </div>
  );
}
