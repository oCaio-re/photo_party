import { NextRequest, NextResponse } from "next/server";
import { db, ensureSchema } from "@/db";
import { events, chatMessages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import crypto from "crypto";

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

    // Return the latest messages in chronological order (up to 150)
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.eventId, event.id))
      .orderBy(asc(chatMessages.createdAt))
      .limit(150);

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return NextResponse.json({ error: "Erro ao carregar mensagens" }, { status: 500 });
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

    const body = await request.json().catch(() => ({}));
    const rawMessage = typeof body.message === "string" ? body.message.trim() : "";

    if (!rawMessage) {
      return NextResponse.json({ error: "A mensagem não pode ser vazia" }, { status: 400 });
    }

    if (rawMessage.length > 500) {
      return NextResponse.json(
        { error: "A mensagem pode ter no máximo 500 caracteres" },
        { status: 400 }
      );
    }

    const headerSessionId = request.headers.get("x-guest-session-id");
    const guestSessionId = headerSessionId || body.guestSessionId || crypto.randomUUID();
    const guestName =
      (typeof body.guestName === "string" && body.guestName.trim()) || "Convidado Anônimo";
    const tableIdentifier =
      typeof body.tableIdentifier === "string" && body.tableIdentifier.trim()
        ? body.tableIdentifier.trim()
        : null;

    const messageId = crypto.randomUUID();
    const now = new Date();

    const [newMessage] = await db
      .insert(chatMessages)
      .values({
        id: messageId,
        eventId: event.id,
        guestSessionId,
        guestName,
        tableIdentifier,
        message: rawMessage,
        createdAt: now,
      })
      .returning();

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error) {
    console.error("Error sending chat message:", error);
    return NextResponse.json({ error: "Erro ao enviar mensagem" }, { status: 500 });
  }
}
