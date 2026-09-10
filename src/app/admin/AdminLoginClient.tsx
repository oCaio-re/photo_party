"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { MonogramLogo } from "@/components/MonogramLogo";
import { Lock, User, Eye, EyeOff, Sparkles, ArrowRight, Loader2 } from "lucide-react";

export function AdminLoginClient() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Por favor, preencha o usuário e a senha.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Usuário ou senha inválidos.");
      }

      // Refresh to load authenticated admin page
      router.refresh();
      window.location.reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao efetuar login.";
      setError(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-4 selection:bg-[#cb7d87]/20 selection:text-[#cb7d87]">
      <div className="w-full max-w-md">
        {/* Brand Monogram */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-[#cb7d87] flex items-center justify-center shadow-lg shadow-[#cb7d87]/25 mb-4 ring-4 ring-[#cb7d87]/15">
            <MonogramLogo size={44} color="#ffffff" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-[#cb7d87]/25 text-[#cb7d87] text-xs font-semibold shadow-2xs mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#cb7d87]" />
            <span>Área dos Noivos</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Painel de Administração
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-xs">
            Acesse para moderar fotos, gerenciar o telão e personalizar os momentos do casamento.
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-xl shadow-gray-200/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Usuário
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="caio ou sarah"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#cb7d87] focus:border-transparent text-sm text-gray-900 transition-all placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full pl-10 pr-11 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#cb7d87] focus:border-transparent text-sm text-gray-900 transition-all placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 animate-fade-in font-medium text-center">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-[#cb7d87] hover:bg-[#b86a76] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 rounded-2xl font-semibold text-sm tracking-wide shadow-md shadow-[#cb7d87]/25 transition-all duration-200 active:scale-[0.99] cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Painel</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Helper */}
          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-[11px] text-gray-400">
              Acesso exclusivo para os noivos do casamento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
