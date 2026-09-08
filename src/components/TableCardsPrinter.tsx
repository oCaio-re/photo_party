"use client";

import React from "react";
import { Printer, QrCode } from "lucide-react";
import { MonogramLogo } from "./MonogramLogo";

export interface TableItem {
  id: string;
  identifier: string;
  qrCodeDataUrl: string | null;
  guestUrl?: string;
}

interface TableCardsPrinterProps {
  eventTitle: string;
  tables: TableItem[];
  genericQr?: string;
  genericUrl?: string;
}

export function TableCardsPrinter({
  eventTitle,
  tables,
  genericQr,
  genericUrl,
}: TableCardsPrinterProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Action header - hidden when printing */}
      <div className="no-print flex items-center justify-between bg-[#fffaf5] p-4 rounded-2xl border border-[#cb7d87]/20 shadow-sm mb-6">
        <div>
          <h4 className="font-serif text-xl text-[#5a6248]">Cartões de Mesa para Impressão</h4>
          <p className="text-xs text-[#7c8764]">
            {tables.length} cartões gerados com QR code individual para cada mesa.
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-[#cb7d87] hover:bg-[#b86a76] text-white px-5 py-2.5 rounded-full font-serif text-base shadow-sm transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir Cartões</span>
        </button>
      </div>

      {/* Grid of Printable Table Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
        {tables.map((table) => (
          <div
            key={table.id}
            className="print-page bg-white border-2 border-[#cb7d87]/40 rounded-3xl p-6 text-center flex flex-col items-center justify-between shadow-xs relative overflow-hidden aspect-[4/5] sm:aspect-auto"
          >
            {/* Subtle botanical decorative border corners */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#cb7d87]/60" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#cb7d87]/60" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#cb7d87]/60" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#cb7d87]/60" />

            <div className="flex flex-col items-center mt-2">
              <MonogramLogo size={52} color="#cb7d87" />
              <h3 className="font-serif text-2xl text-[#5a6248] mt-2 font-medium">
                {eventTitle}
              </h3>
              <div className="inline-block mt-2 px-4 py-1 bg-[#fbead6] rounded-full border border-[#cb7d87]/30">
                <span className="font-serif text-lg font-semibold text-[#832d3b] tracking-wide">
                  {table.identifier}
                </span>
              </div>
            </div>

            {/* QR Code */}
            <div className="my-4 p-3 bg-white border border-[#cb7d87]/30 rounded-2xl shadow-xs flex flex-col items-center">
              {table.qrCodeDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={table.qrCodeDataUrl}
                  alt={`QR Code para ${table.identifier}`}
                  className="w-44 h-44 object-contain"
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center bg-gray-50 text-gray-400">
                  <QrCode className="w-12 h-12" />
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="mb-2">
              <p className="font-serif text-base text-[#cb7d87] font-medium">
                Aponte a câmera do seu celular
              </p>
              <p className="text-[11px] text-[#5a6248] max-w-xs mt-0.5">
                Envie fotos ao vivo, deixe uma dedicatória aos noivos e veja a galeria da festa!
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
