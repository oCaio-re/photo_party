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
      <body className="min-h-screen bg-white text-gray-900 relative flex flex-col font-sans selection:bg-[#dfa4ac] selection:text-[#832d3b]">
        {children}
      </body>
    </html>
  );
}
