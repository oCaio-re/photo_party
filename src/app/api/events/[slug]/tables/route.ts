import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, tables } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateQrCodeDataUrl } from "@/lib/qrcode";
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
    const { slug } = await context.params;

    const event = db.select().from(events).where(eq(events.slug, slug)).get();
    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    }

    const hostOrigin = request.nextUrl.origin;
    const allTables = db.select().from(tables).where(eq(tables.eventId, event.id)).all();

    // Ensure all tables have QR codes generated
    const tablesWithQr = await Promise.all(
      allTables.map(async (t) => {
        const guestUrl = `${hostOrigin}/e/${event.slug}?table=${t.id}`;
        const qrCode = t.qrCodeDataUrl || (await generateQrCodeDataUrl(guestUrl));
        return {
          ...t,
          qrCodeDataUrl: qrCode,
          guestUrl,
        };
      })
    );

    return NextResponse.json({
      tables: tablesWithQr,
      genericQr: await generateQrCodeDataUrl(`${hostOrigin}/e/${event.slug}`),
      genericUrl: `${hostOrigin}/e/${event.slug}`,
    });
  } catch (error) {
    console.error("Error fetching tables:", error);
    return NextResponse.json({ error: "Erro ao carregar mesas" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    const event = db.select().from(events).where(eq(events.slug, slug)).get();
    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    }

    if (!verifyHostKey(request, event.hostKey)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { count, names, prefix = "Mesa" } = body;
    const now = new Date();
    const origin = request.nextUrl.origin;

    const created = [];

    if (Array.isArray(names) && names.length > 0) {
      for (const name of names) {
        if (typeof name === "string" && name.trim()) {
          const id = crypto.randomUUID();
          const guestUrl = `${origin}/e/${event.slug}?table=${id}`;
          const qrCodeDataUrl = await generateQrCodeDataUrl(guestUrl);

          db.insert(tables)
            .values({
              id,
              eventId: event.id,
              identifier: name.trim(),
              qrCodeDataUrl,
              createdAt: now,
            })
            .run();

          created.push({ id, identifier: name.trim(), qrCodeDataUrl, guestUrl });
        }
      }
    } else if (Number(count) > 0) {
      const tableCount = Math.min(Number(count), 100);
      for (let i = 1; i <= tableCount; i++) {
        const id = crypto.randomUUID();
        const identifier = `${prefix} ${i}`;
        const guestUrl = `${origin}/e/${event.slug}?table=${id}`;
        const qrCodeDataUrl = await generateQrCodeDataUrl(guestUrl);

        db.insert(tables)
          .values({
            id,
            eventId: event.id,
            identifier,
            qrCodeDataUrl,
            createdAt: now,
          })
          .run();

        created.push({ id, identifier, qrCodeDataUrl, guestUrl });
      }
    } else {
      return NextResponse.json({ error: "Especifique uma quantidade de mesas ou lista de nomes" }, { status: 400 });
    }

    return NextResponse.json({ success: true, created });
  } catch (error) {
    console.error("Error creating tables:", error);
    return NextResponse.json({ error: "Erro ao gerar mesas" }, { status: 500 });
  }
}
