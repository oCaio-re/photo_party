import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, photoComments } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ slug: string; photoId: string; commentId: string }> }
) {
  try {
    const { slug, photoId, commentId } = await context.params;
    const { searchParams } = new URL(request.url);

    const [event] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    }

    const [comment] = await db
      .select()
      .from(photoComments)
      .where(and(eq(photoComments.id, commentId), eq(photoComments.photoId, photoId)))
      .limit(1);

    if (!comment) {
      return NextResponse.json({ error: "Comentário não encontrado" }, { status: 404 });
    }

    const authHeader = request.headers.get("authorization");
    const keyParam = searchParams.get("key");
    const providedKey = authHeader?.replace(/^Bearer\s+/i, "") || keyParam;
    const isHost = Boolean(providedKey && providedKey === event.hostKey);

    const guestSessionId = (
      request.headers.get("x-guest-session-id") ||
      searchParams.get("guestSessionId") ||
      ""
    ).trim();

    const isAuthor = Boolean(guestSessionId && guestSessionId === comment.guestSessionId);

    if (!isHost && !isAuthor) {
      return NextResponse.json(
        { error: "Não autorizado a remover este comentário" },
        { status: 403 }
      );
    }

    await db
      .delete(photoComments)
      .where(eq(photoComments.id, commentId));

    return NextResponse.json({ success: true, deletedId: commentId });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "Erro ao remover comentário" },
      { status: 500 }
    );
  }
}
