import { NextRequest, NextResponse } from "next/server";
import { db, ensureSchema } from "@/db";
import { events, chatMessages } from "@/db/schema";
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
  context: { params: Promise<{ slug: string; messageId: string }> }
) {
  try {
    await ensureSchema();
    const { slug, messageId } = await context.params;

    const [event] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    }

    const [msg] = await db
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.id, messageId), eq(chatMessages.eventId, event.id)))
      .limit(1);

    if (!msg) {
      return NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 });
    }

    const isHost = verifyHostKey(request, event.hostKey);
    const url = new URL(request.url);
    const guestSessionId =
      request.headers.get("x-guest-session-id") || url.searchParams.get("guestSessionId");
    const isAuthor = Boolean(guestSessionId && guestSessionId === msg.guestSessionId);

    if (!isHost && !isAuthor) {
      return NextResponse.json(
        { error: "Não autorizado a excluir esta mensagem" },
        { status: 403 }
      );
    }

    await db.delete(chatMessages).where(eq(chatMessages.id, messageId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting chat message:", error);
    return NextResponse.json({ error: "Erro ao excluir mensagem" }, { status: 500 });
  }
}
