import React from "react";

interface MonogramLogoProps {
  className?: string;
  size?: number;
  color?: string;
}

export function MonogramLogo({ className = "", size = 64, color = "#cb7d87" }: MonogramLogoProps) {
  return (
    <div
      className={`inline-block shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        WebkitMaskImage: "url('/logo_icon.svg')",
        WebkitMaskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskImage: "url('/logo_icon.svg')",
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center",
      }}
      aria-label="Monograma do Casamento"
    />
  );
}
