import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, photos, tables } from "@/db/schema";
import { eq, and, gt, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const { searchParams } = new URL(request.url);

    const event = db.select().from(events).where(eq(events.slug, slug)).get();
    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    }

    // Check host key
    const authHeader = request.headers.get("authorization");
    const keyParam = searchParams.get("key");
    const providedKey = authHeader?.replace(/^Bearer\s+/i, "") || keyParam;
    const isHost = providedKey === event.hostKey;

    const requestedStatus = searchParams.get("status"); // 'approved' | 'pending' | 'hidden' | 'all'
    const sinceParam = searchParams.get("since");
    const sinceDate = sinceParam ? new Date(Number(sinceParam)) : null;

    // Base query
    const conditions = [eq(photos.eventId, event.id)];

    if (sinceDate && !isNaN(sinceDate.getTime())) {
      conditions.push(gt(photos.createdAt, sinceDate));
    }

    if (isHost && requestedStatus) {
      if (requestedStatus !== "all") {
        conditions.push(eq(photos.status, requestedStatus as "approved" | "pending" | "hidden"));
      }
    } else {
      // Guests only see approved photos
      conditions.push(eq(photos.status, "approved"));
    }

    const results = db
      .select({
        id: photos.id,
        url: photos.url,
        guestName: photos.guestName,
        message: photos.message,
        status: photos.status,
        createdAt: photos.createdAt,
        tableId: photos.tableId,
        tableIdentifier: tables.identifier,
      })
      .from(photos)
      .leftJoin(tables, eq(photos.tableId, tables.id))
      .where(and(...conditions))
      .orderBy(desc(photos.createdAt))
      .all();

    return NextResponse.json({
      photos: results,
      timestamp: Date.now(),
      event: {
        title: event.title,
        slug: event.slug,
        isUploadClosed: event.isUploadClosed,
        uploadDeadline: event.uploadDeadline,
      },
    });
  } catch (error) {
    console.error("Error fetching photos:", error);
    return NextResponse.json({ error: "Erro ao carregar fotos" }, { status: 500 });
  }
}
