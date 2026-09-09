import { NextRequest, NextResponse } from "next/server";
import { db, ensureSchema } from "@/db";
import { events, photoQuests, photos } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";

function verifyHostKey(request: NextRequest, hostKey: string): boolean {
  const authHeader = request.headers.get("authorization");
  const url = new URL(request.url);
  const keyParam = url.searchParams.get("key");
  const providedKey = authHeader?.replace(/^Bearer\s+/i, "") || keyParam;
  return Boolean(providedKey && providedKey === hostKey);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    await ensureSchema();
    const { slug } = await context.params;

    const [event] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    }

    // Fetch all active quests
    const quests = await db
      .select()
      .from(photoQuests)
      .where(and(eq(photoQuests.eventId, event.id), eq(photoQuests.isActive, true)))
      .orderBy(photoQuests.createdAt);

    // Get count of approved photos per quest
    const photoCounts = await db
      .select({
        questId: photos.questId,
        count: sql<number>`count(*)::int`,
      })
      .from(photos)
      .where(and(eq(photos.eventId, event.id), eq(photos.status, "approved")))
      .groupBy(photos.questId);

    const countMap = new Map<string, number>();
    for (const item of photoCounts) {
      if (item.questId) {
        countMap.set(item.questId, item.count);
      }
    }

    const questsWithCounts = quests.map((q) => ({
      ...q,
      completedCount: countMap.get(q.id) || 0,
    }));

    return NextResponse.json({ quests: questsWithCounts });
  } catch (error) {
    console.error("Error fetching photo quests:", error);
    return NextResponse.json({ error: "Erro ao carregar desafios" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    await ensureSchema();
    const { slug } = await context.params;

    const [event] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    }

    if (!verifyHostKey(request, event.hostKey)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const icon = typeof body.icon === "string" && body.icon.trim() ? body.icon.trim().slice(0, 10) : "🎯";

    if (!title) {
      return NextResponse.json({ error: "O título do desafio é obrigatório" }, { status: 400 });
    }

    const newQuestId = crypto.randomUUID();
    const now = new Date();

    await db.insert(photoQuests).values({
      id: newQuestId,
      eventId: event.id,
      title: title.slice(0, 120),
      description: description.slice(0, 300),
      icon,
      isActive: true,
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      quest: {
        id: newQuestId,
        eventId: event.id,
        title,
        description,
        icon,
        isActive: true,
        completedCount: 0,
        createdAt: now,
      },
    });
  } catch (error) {
    console.error("Error creating photo quest:", error);
    return NextResponse.json({ error: "Erro ao criar desafio" }, { status: 500 });
  }
}
