"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { TableCardsPrinter, TableItem } from "@/components/TableCardsPrinter";

interface TablesTabProps {
  slug: string;
  hostKey: string;
  eventTitle: string;
  tables: TableItem[];
  onTablesCreated: (created: TableItem[]) => void;
}

export function TablesTab({ slug, hostKey, eventTitle, tables, onTablesCreated }: TablesTabProps) {
  const [newTableCount, setNewTableCount] = useState<number>(5);
  const [isGeneratingTables, setIsGeneratingTables] = useState(false);

  const handleGenerateTables = async () => {
    try {
      setIsGeneratingTables(true);
      const res = await fetch(`/api/events/${slug}/tables?key=${hostKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: newTableCount }),
      });
      const data = await res.json();
      if (res.ok && data.created) {
        onTablesCreated(data.created);
      }
    } catch (err) {
      console.error("Error generating tables:", err);
    } finally {
      setIsGeneratingTables(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900">Gerar Mesas Adicionais</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Adicione novas mesas para gerar QR Codes individuais automaticamente.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <input
            type="number"
            min="1"
            max="50"
            value={newTableCount}
            onChange={(e) => setNewTableCount(Number(e.target.value))}
            className="w-20 px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-xs text-center text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-marsala-ink"
          />
          <button
            onClick={handleGenerateTables}
            disabled={isGeneratingTables}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-marsala-ink hover:bg-marsala-ink-hover disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isGeneratingTables ? "Gerando..." : "Adicionar Mesas"}</span>
          </button>
        </div>
      </div>

      <TableCardsPrinter
        eventTitle={eventTitle}
        tables={tables}
      />
    </div>
  );
}
