"use client";

import React from "react";

interface GuestWelcomeCardProps {
  tableName?: string;
  className?: string;
}

/**
 * One-line greeting for a Guest arriving from a Table QR code. The floating
 * "Tirar Foto" button is the single primary action, so this only points at it.
 */
export function GuestWelcomeCard({ tableName, className = "" }: GuestWelcomeCardProps) {
  return (
    <p
      className={`w-full rounded-2xl bg-[#fffaf5] border border-[#cb7d87]/25 px-4 py-3 text-sm text-gray-700 leading-snug ${className}`}
    >
      <strong className="font-semibold text-gray-900">
        {tableName ? `Olá, convidados da ${tableName}!` : "Olá, que bom ter você aqui!"}
      </strong>{" "}
      Toque em <strong className="font-semibold text-marsala-ink">Tirar Foto</strong>, lá embaixo, e sua foto vai
      direto para o telão da festa.
    </p>
  );
}
