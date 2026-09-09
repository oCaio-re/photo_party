import { NextRequest, NextResponse } from "next/server";
import { db, ensureSchema } from "@/db";
import { events, tables } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();

    const body = await request.json();
    const { title, slug: customSlug, moderationPolicy = "immediate", uploadHours } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "Título do evento é obrigatório" }, { status: 400 });
    }

    // Generate clean slug
    let baseSlug = (customSlug || title)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    if (!baseSlug) baseSlug = "evento";

    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
      if (existing.length === 0) break;
      slug = `${baseSlug}-${counter++}`;
    }

    const eventId = crypto.randomUUID();
    const hostKey = crypto.randomBytes(16).toString("hex");
    const now = new Date();

    let uploadDeadline: Date | null = null;
    if (uploadHours && Number(uploadHours) > 0) {
      uploadDeadline = new Date(now.getTime() + Number(uploadHours) * 60 * 60 * 1000);
    }

    await db.insert(events)
      .values({
        id: eventId,
        slug,
        title: title.trim(),
        hostKey,
        moderationPolicy: moderationPolicy === "approval_required" ? "approval_required" : "immediate",
        uploadDeadline,
        isUploadClosed: false,
        createdAt: now,
      });

    // Default initial tables
    const defaultTables = ["Mesa 1", "Mesa 2", "Mesa 3", "Mesa 4", "Mesa 5"];
    for (const tableName of defaultTables) {
      await db.insert(tables)
        .values({
          id: crypto.randomUUID(),
          eventId,
          identifier: tableName,
          createdAt: now,
        });
    }

    return NextResponse.json({
      success: true,
      event: {
        id: eventId,
        slug,
        title,
        moderationPolicy,
        uploadDeadline,
        hostKey,
      },
      publicUrl: `/e/${slug}`,
      adminUrl: `/e/${slug}/admin?key=${hostKey}`,
    });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json({ error: "Erro interno ao criar evento" }, { status: 500 });
  }
}
