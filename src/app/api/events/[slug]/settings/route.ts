import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";

function verifyHostKey(request: NextRequest, hostKey: string): boolean {
  const authHeader = request.headers.get("authorization");
  const url = new URL(request.url);
  const keyParam = url.searchParams.get("key");
  const providedKey = authHeader?.replace(/^Bearer\s+/i, "") || keyParam;
  return Boolean(providedKey && providedKey === hostKey);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    const [event] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    }

    if (!verifyHostKey(request, event.hostKey)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { isUploadClosed, uploadDeadline, moderationPolicy, title } = body;

    const updateData: Partial<typeof events.$inferInsert> = {};

    if (typeof isUploadClosed === "boolean") {
      updateData.isUploadClosed = isUploadClosed;
    }

    if (uploadDeadline !== undefined) {
      updateData.uploadDeadline = uploadDeadline ? new Date(uploadDeadline) : null;
    }

    if (moderationPolicy && ["immediate", "approval_required"].includes(moderationPolicy)) {
      updateData.moderationPolicy = moderationPolicy;
    }

    if (typeof title === "string" && title.trim()) {
      updateData.title = title.trim();
    }

    await db.update(events).set(updateData).where(eq(events.id, event.id));

    return NextResponse.json({ success: true, updated: updateData });
  } catch (error) {
    console.error("Error updating event settings:", error);
    return NextResponse.json({ error: "Erro ao atualizar configurações" }, { status: 500 });
  }
}
