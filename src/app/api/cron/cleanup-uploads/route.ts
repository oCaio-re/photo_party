import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pendingUploads } from "@/db/schema";
import { inArray, lt } from "drizzle-orm";
import { getStorageProvider } from "@/lib/storage";

// Presigned URLs expire after 10 minutes, so anything older than this can never be confirmed
const ABANDONED_AFTER_MS = 60 * 60 * 1000;
const BATCH_SIZE = 500;

/**
 * Deletes files of direct uploads that were PUT to storage but never confirmed
 * (Guest closed the page mid-upload). Scheduled by vercel.json; Vercel sends
 * `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - ABANDONED_AFTER_MS);
    const stale = await db
      .select({ key: pendingUploads.key })
      .from(pendingUploads)
      .where(lt(pendingUploads.createdAt, cutoff))
      .limit(BATCH_SIZE);

    const storage = getStorageProvider();
    for (const { key } of stale) {
      // Most abandoned keys never received a file; a missing object is fine
      await storage.deleteFile(key).catch((e) => console.warn(`Cleanup could not delete ${key}:`, e));
    }

    if (stale.length > 0) {
      await db.delete(pendingUploads).where(inArray(pendingUploads.key, stale.map((s) => s.key)));
    }

    return NextResponse.json({ deleted: stale.length, hasMore: stale.length === BATCH_SIZE });
  } catch (error) {
    console.error("Upload cleanup error:", error);
    return NextResponse.json({ error: "Falha na limpeza de uploads" }, { status: 500 });
  }
}
