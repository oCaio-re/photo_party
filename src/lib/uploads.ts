import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { photos, tables, photoQuests, type Event } from "@/db/schema";

/** Returns a guest-facing reason when the Event is not accepting uploads. */
export function getUploadBlockReason(event: Event): string | null {
  if (event.isUploadClosed) {
    return "O recebimento de fotos deste evento foi encerrado pelo anfitrião.";
  }
  if (event.uploadDeadline && new Date() > event.uploadDeadline) {
    return "A janela de tempo para envio de fotos expirou.";
  }
  return null;
}

export interface UploadMetadata {
  tableId?: string | null;
  questId?: string | null;
  guestName?: string | null;
  message?: string | null;
  moment?: string | null;
  guestSessionId?: string | null;
}

function cleanString(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : null;
}

/**
 * Validates table/quest ownership, inserts the Photo row and builds the API response
 * shared by both the server-side and direct-to-storage upload flows.
 */
export async function createPhotoRecord(params: {
  event: Event;
  storagePath: string;
  url: string;
  mediaType: "photo" | "video";
  metadata: UploadMetadata;
}) {
  const { event, storagePath, url, mediaType, metadata } = params;

  const tableId = cleanString(metadata.tableId, 100);
  let validTableId: string | null = null;
  if (tableId) {
    const [tableRecord] = await db.select().from(tables).where(eq(tables.id, tableId)).limit(1);
    if (tableRecord && tableRecord.eventId === event.id) {
      validTableId = tableRecord.id;
    }
  }

  const questId = cleanString(metadata.questId, 100);
  let validQuestId: string | null = null;
  let validQuestTitle: string | null = null;
  if (questId) {
    const [questRecord] = await db.select().from(photoQuests).where(eq(photoQuests.id, questId)).limit(1);
    if (questRecord && questRecord.eventId === event.id) {
      validQuestId = questRecord.id;
      validQuestTitle = questRecord.title;
    }
  }

  const guestName = cleanString(metadata.guestName, 100);
  const message = cleanString(metadata.message, 500);
  const moment = cleanString(metadata.moment, 50);
  const guestSessionId = cleanString(metadata.guestSessionId, 100);

  const initialStatus = event.moderationPolicy === "approval_required" ? "pending" : "approved";
  const photoId = crypto.randomUUID();
  const now = new Date();

  await db.insert(photos).values({
    id: photoId,
    eventId: event.id,
    tableId: validTableId,
    questId: validQuestId,
    questTitle: validQuestTitle,
    guestName,
    guestSessionId,
    message,
    mediaType,
    moment,
    storagePath,
    url,
    status: initialStatus,
    createdAt: now,
  });

  return {
    success: true,
    photo: {
      id: photoId,
      url,
      status: initialStatus,
      guestName,
      message,
      mediaType,
      moment,
      questId: validQuestId,
      questTitle: validQuestTitle,
      canDelete: true,
      createdAt: now.toISOString(),
    },
    message:
      initialStatus === "pending"
        ? "Mídia enviada com sucesso! Aguardando aprovação do anfitrião."
        : "Mídia publicada com sucesso na Live Gallery!",
  };
}
