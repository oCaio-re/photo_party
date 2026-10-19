"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Filter } from "lucide-react";
import type { WeddingMomentConfig } from "@/lib/moments";

export interface GalleryFilters {
  /** "all" | "likes" | "videos" | "quests" | a Wedding Moment id */
  category: string;
  table: string;
  quest: string;
  sort: "recent" | "likes";
}

export const DEFAULT_GALLERY_FILTERS: GalleryFilters = {
  category: "all",
  table: "all",
  quest: "all",
  sort: "recent",
};

const ACTIVE_PILL = "bg-marsala-ink text-white border-[#cb7d87] shadow-xs";
const IDLE_PILL = "bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200";

interface GalleryFilterBarProps {
  filters: GalleryFilters;
  onChange: (patch: Partial<GalleryFilters>) => void;
  tableName?: string;
  tableOptions: string[];
  moments: WeddingMomentConfig[];
}

export function GalleryFilterBar({ filters, onChange, tableName, tableOptions, moments }: GalleryFilterBarProps) {
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const { category, table, quest, sort } = filters;

  return (
    <div className="px-4 sm:px-2 pt-3 pb-2 border-b border-gray-100 bg-white space-y-2">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
        {/* 1. Todas as Fotos */}
        <button
          type="button"
          onClick={() => onChange(DEFAULT_GALLERY_FILTERS)}
          className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
            category === "all" && table === "all" && quest === "all" ? ACTIVE_PILL : IDLE_PILL
          }`}
        >
          📸 Todas as Fotos
        </button>

        {/* 2. Nossa Mesa */}
        {tableName ? (
          <button
            type="button"
            onClick={() => onChange({ table: tableName, category: "all", quest: "all" })}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
              table === tableName ? ACTIVE_PILL : IDLE_PILL
            }`}
          >
            🍽️ Nossa {tableName}
          </button>
        ) : tableOptions.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowMoreFilters((prev) => !prev)}
            className="px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 cursor-pointer"
          >
            🍽️ Escolher Mesa
          </button>
        ) : null}

        {/* 3. Mais Curtidas */}
        <button
          type="button"
          onClick={() => onChange({ category: "likes", sort: "likes" })}
          className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
            category === "likes" || sort === "likes" ? ACTIVE_PILL : IDLE_PILL
          }`}
        >
          ❤️ Mais Curtidas
        </button>

        {/* 4. More filters toggle */}
        <button
          type="button"
          onClick={() => setShowMoreFilters((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
            showMoreFilters || (category !== "all" && category !== "likes") || (table !== "all" && table !== tableName)
              ? "bg-[#5a6248] text-white border-[#5a6248]"
              : IDLE_PILL
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Mais Filtros</span>
          {showMoreFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expandable Secondary Filters (Moments, Tables) */}
      {showMoreFilters && (
        <div className="p-3 bg-[#fffaf5] border border-[#cb7d87]/20 rounded-2xl space-y-2.5 animate-fade-in text-xs">
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-marsala-ink mb-1">
              Filtrar por Momento:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {moments.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onChange({ category: m.id, table: "all", quest: "all" })}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all border cursor-pointer ${
                    category === m.id
                      ? "bg-marsala-ink text-white border-[#cb7d87] font-semibold"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span>{m.icon}</span>
                  <span>{m.name}</span>
                </button>
              ))}
            </div>
          </div>

          {tableOptions.length > 0 && (
            <div className="pt-2 border-t border-[#cb7d87]/15">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-1">
                Filtrar por Outra Mesa:
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {tableOptions.map((tName) => (
                  <button
                    key={tName}
                    type="button"
                    onClick={() => onChange({ table: tName, category: "all" })}
                    className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap border cursor-pointer transition-all ${
                      table === tName
                        ? "bg-gray-900 text-white border-gray-900 font-semibold"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <span>{tName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
