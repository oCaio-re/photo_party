import { NextRequest, NextResponse } from "next/server";
import { db, ensureSchema } from "@/db";
import { events, photoQuests } from "@/db/schema";
import { eq, and } from "drizzle-orm";

function verifyHostKey(request: NextRequest, hostKey: string): boolean {
  const authHeader = request.headers.get("authorization");
  const url = new URL(request.url);
  const keyParam = url.searchParams.get("key");
  const providedKey = authHeader?.replace(/^Bearer\s+/i, "") || keyParam;
  return Boolean(providedKey && providedKey === hostKey);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ slug: string; questId: string }> }
) {
  try {
    await ensureSchema();
    const { slug, questId } = await context.params;

    const [event] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    }

    if (!verifyHostKey(request, event.hostKey)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    await db
      .delete(photoQuests)
      .where(and(eq(photoQuests.id, questId), eq(photoQuests.eventId, event.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting quest:", error);
    return NextResponse.json({ error: "Erro ao excluir desafio" }, { status: 500 });
  }
}
