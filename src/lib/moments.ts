export interface WeddingMomentConfig {
  id: string;
  name: string;
  icon: string;
  startTime: string; // HH:mm format (e.g. "15:00")
  endTime: string;   // HH:mm format (e.g. "17:00")
  fallbackImage: string;
  description?: string;
}

export const DEFAULT_WEDDING_MOMENTS: WeddingMomentConfig[] = [
  {
    id: "cerimonia",
    name: "Cerimônia",
    icon: "⛪",
    startTime: "15:00",
    endTime: "17:00",
    fallbackImage: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80",
    description: "A bênção, os votos e o primeiro beijo dos noivos",
  },
  {
    id: "recepcao",
    name: "Recepção e Fotos",
    icon: "🥂",
    startTime: "17:00",
    endTime: "19:00",
    fallbackImage: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80",
    description: "Coquetel de boas-vindas, abraços e cliques com padrinhos",
  },
  {
    id: "jantar",
    name: "Jantar Especial",
    icon: "🍽️",
    startTime: "19:00",
    endTime: "20:30",
    fallbackImage: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=800&q=80",
    description: "Gastronomia, mesas reunidas e conversas deliciosas",
  },
  {
    id: "bolo",
    name: "Bolo e Brinde",
    icon: "🎂",
    startTime: "20:30",
    endTime: "21:30",
    fallbackImage: "https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=800&q=80",
    description: "Corte tradicional do bolo, brinde com champanhe e docinhos",
  },
  {
    id: "festa",
    name: "Início da Festa",
    icon: "🕺",
    startTime: "21:30",
    endTime: "23:30",
    fallbackImage: "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=800&q=80",
    description: "Pista aberta, dança dos noivos e pura energia",
  },
  {
    id: "encerramento",
    name: "Encerramento",
    icon: "✨",
    startTime: "23:30",
    endTime: "02:00",
    fallbackImage: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=800&q=80",
    description: "Últimas músicas, despedidas calorosas e lembrancinhas",
  },
];

/**
 * Returns time string "HH:mm" in Brazilian Time (America/Sao_Paulo, UTC-3)
 */
export function getBrasiliaTimeString(date: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);

    const hour = parts.find((p) => p.type === "hour")?.value || "00";
    const minute = parts.find((p) => p.type === "minute")?.value || "00";
    return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  } catch {
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
}

/**
 * Checks if a given "HH:mm" falls within [start, end) range.
 * Handles cases where endTime is past midnight (e.g. 23:30 to 02:00).
 */
export function isTimeInMomentRange(time: string, start: string, end: string): boolean {
  if (start <= end) {
    return time >= start && time < end;
  }
  // Crosses midnight, e.g. 23:30 to 02:00
  return time >= start || time < end;
}

/**
 * Determines current active moment based on Brasilia time.
 * If outside schedule, falls back to the first moment.
 */
export function getCurrentActiveMomentId(
  moments: WeddingMomentConfig[] = DEFAULT_WEDDING_MOMENTS,
  date: Date = new Date()
): string {
  if (!moments || moments.length === 0) return DEFAULT_WEDDING_MOMENTS[0].id;

  const currentHHMM = getBrasiliaTimeString(date);
  for (const m of moments) {
    if (isTimeInMomentRange(currentHHMM, m.startTime, m.endTime)) {
      return m.id;
    }
  }

  // Fallback to first moment
  return moments[0].id;
}

export function parseMomentsConfig(configString?: string | null): WeddingMomentConfig[] {
  if (!configString) return DEFAULT_WEDDING_MOMENTS;
  try {
    const parsed = JSON.parse(configString);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && parsed[0].name) {
      return parsed;
    }
  } catch {
    // ignore parse error
  }
  return DEFAULT_WEDDING_MOMENTS;
}
