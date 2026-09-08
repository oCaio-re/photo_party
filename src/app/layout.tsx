import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Photo Party | Compartilhamento de Fotos do Evento",
  description: "Envie fotos ao vivo pelo QR Code na sua mesa e celebre conosco!",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${poppins.variable} ${inter.variable} h-full`}>
      <body className="min-h-screen relative flex flex-col font-sans selection:bg-[#ebca90] selection:text-[#cb7d87]">
        {/* Subtle tactile texture overlay */}
        <svg
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[999] w-full h-full opacity-[0.06] mix-blend-multiply"
        >
          <filter id="paper-texture">
            <feTurbulence type="fractalNoise" baseFrequency="0.04 0.6" numOctaves="3" result="noise-h" />
            <feDiffuseLighting in="noise-h" lightingColor="#fff" surfaceScale="1.5" result="light-h">
              <feDistantLight azimuth="45" elevation="60" />
            </feDiffuseLighting>
            <feTurbulence type="fractalNoise" baseFrequency="0.6 0.04" numOctaves="3" result="noise-v" />
            <feDiffuseLighting in="noise-v" lightingColor="#fff" surfaceScale="1.5" result="light-v">
              <feDistantLight azimuth="135" elevation="60" />
            </feDiffuseLighting>
            <feBlend in="light-h" in2="light-v" mode="multiply" />
          </filter>
          <rect width="100%" height="100%" filter="url(#paper-texture)" />
        </svg>

        {children}
      </body>
    </html>
  );
}
