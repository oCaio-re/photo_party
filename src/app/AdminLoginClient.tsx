"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MonogramLogo } from "@/components/MonogramLogo";
import { Lock, User, Eye, EyeOff, Sparkles, ArrowRight, Loader2, Camera } from "lucide-react";

interface AdminLoginClientProps {
  /** Event the "looking for the party page?" shortcut points to. */
  eventSlug?: string;
  eventTitle?: string;
}

export function AdminLoginClient({ eventSlug, eventTitle }: AdminLoginClientProps) {
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
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-4 selection:bg-[#cb7d87]/20 selection:text-marsala-ink">
      <div className="w-full max-w-md">
        {/* Shortcut for Guests who landed on the admin login by accident */}
        {eventSlug && (
          <Link
            href={`/e/${eventSlug}`}
            className="group flex items-center gap-3 mb-8 p-4 rounded-2xl bg-[#fffaf5] border border-[#cb7d87]/30 hover:border-[#cb7d87] hover:bg-rose-50 shadow-xs transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-marsala-ink text-white flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-gray-900">Você é convidado?</p>
              <p className="text-xs text-gray-600 leading-snug">
                Se você está procurando a página do casamento{eventTitle ? ` de ${eventTitle}` : ""}, toque aqui para ver
                e enviar fotos.
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-marsala-ink shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}

        {/* Brand Monogram */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-marsala-ink flex items-center justify-center shadow-lg shadow-[#cb7d87]/25 mb-4 ring-4 ring-[#cb7d87]/15">
            <MonogramLogo size={44} color="#ffffff" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-[#cb7d87]/25 text-marsala-ink text-xs font-semibold shadow-2xs mb-2">
            <Sparkles className="w-3.5 h-3.5 text-marsala-ink" />
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
              <label htmlFor="admin-username" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Usuário
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="admin-username"
                  type="text"
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Seu usuário"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-marsala-ink focus:border-transparent text-base sm:text-sm text-gray-900 transition-all placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="admin-password" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="admin-password"
                  autoComplete="current-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full pl-10 pr-11 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-marsala-ink focus:border-transparent text-base sm:text-sm text-gray-900 transition-all placeholder:text-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-3.5 flex items-center text-gray-500 hover:text-gray-700 transition-colors cursor-pointer rounded-r-2xl"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 animate-fade-in font-medium text-center">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-marsala-ink hover:bg-marsala-ink-hover disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 rounded-2xl font-semibold text-sm tracking-wide shadow-md shadow-[#cb7d87]/25 transition-all duration-200 active:scale-[0.99] cursor-pointer"
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
            <p className="text-xs text-gray-500">
              Acesso exclusivo para os noivos do casamento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
