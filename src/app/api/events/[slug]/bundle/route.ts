import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, photos, tables } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getStorageProvider } from "@/lib/storage";
import { ZipArchive } from "archiver";
import { PassThrough, Readable } from "stream";

// Large bundles stream for a while; allow the longest duration the plan permits
export const maxDuration = 300;

/**
 * Photos per ZIP part. Keeps each request well inside the function time limit;
 * the admin UI offers one download per part.
 */
const BUNDLE_PART_SIZE = 150;

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
    const { searchParams } = new URL(request.url);

    const [event] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    }

    if (!verifyHostKey(request, event.hostKey)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Oldest first so part numbering stays stable while new photos arrive
    const allPhotos = await db
      .select({
        id: photos.id,
        storagePath: photos.storagePath,
        guestName: photos.guestName,
        message: photos.message,
        createdAt: photos.createdAt,
        tableIdentifier: tables.identifier,
      })
      .from(photos)
      .leftJoin(tables, eq(photos.tableId, tables.id))
      .where(and(eq(photos.eventId, event.id), eq(photos.status, "approved")))
      .orderBy(asc(photos.createdAt), asc(photos.id));

    const totalParts = Math.max(1, Math.ceil(allPhotos.length / BUNDLE_PART_SIZE));

    if (searchParams.get("info") !== null) {
      return NextResponse.json({
        totalPhotos: allPhotos.length,
        partSize: BUNDLE_PART_SIZE,
        totalParts,
      });
    }

    if (allPhotos.length === 0) {
      return NextResponse.json({ error: "Nenhuma foto aprovada para exportar." }, { status: 400 });
    }

    const part = Math.floor(Number(searchParams.get("part") || "1"));
    if (!Number.isFinite(part) || part < 1 || part > totalParts) {
      return NextResponse.json({ error: `Parte inválida. Escolha entre 1 e ${totalParts}.` }, { status: 400 });
    }

    const offset = (part - 1) * BUNDLE_PART_SIZE;
    const partPhotos = allPhotos.slice(offset, offset + BUNDLE_PART_SIZE);

    const storage = getStorageProvider();
    const passThrough = new PassThrough();
    const archive = new ZipArchive({ zlib: { level: 6 } });

    archive.on("error", (err) => {
      console.error("Archive error:", err);
      passThrough.destroy(err);
    });

    archive.pipe(passThrough);

    // Stream photos into the archive one at a time: opening every storage
    // stream up front would hold hundreds of idle connections open.
    (async () => {
      try {
        let index = offset + 1;
        for (const item of partPhotos) {
          try {
            const stream = await storage.getFileStream(item.storagePath);
            const ext = item.storagePath.split(".").pop() || "jpg";
            const tableClean = (item.tableIdentifier || "Geral").replace(/[^a-zA-Z0-9_-]/g, "_");
            const nameClean = (item.guestName || "Anonimo").replace(/[^a-zA-Z0-9_-]/g, "_");
            const entryName = `fotos/${tableClean}_${nameClean}_${index.toString().padStart(4, "0")}.${ext}`;
            const entryWritten = new Promise<void>((resolve) => archive.once("entry", () => resolve()));
            archive.append(stream, { name: entryName });
            await entryWritten;
          } catch (fileErr) {
            console.warn(`Could not read file for bundle: ${item.storagePath}`, fileErr);
          }
          index++;
        }

        // Dedications manifest covers the whole Event, so it ships with part 1 only
        if (part === 1) {
          const manifestLines = [
            `# ${event.title} - Livro de Recordações`,
            `Data de exportação: ${new Date().toISOString()}`,
            `Total de fotos: ${allPhotos.length}${totalParts > 1 ? ` (em ${totalParts} partes)` : ""}`,
            "",
            "--- DEDICATÓRIAS DOS CONVIDADOS ---",
            "",
          ];

          for (const item of allPhotos) {
            if (item.message || item.guestName) {
              manifestLines.push(
                `[${item.tableIdentifier || "Mesa"}] De: ${item.guestName || "Convidado Anónimo"}`
              );
              if (item.message) manifestLines.push(`"${item.message}"`);
              manifestLines.push("");
            }
          }

          archive.append(manifestLines.join("\n"), { name: "dedicatorias_e_mensagens.txt" });
        }
        await archive.finalize();
      } catch (e) {
        console.error("Error archiving photos:", e);
        passThrough.destroy(e as Error);
      }
    })();

    const partSuffix = totalParts > 1 ? `-parte-${part}-de-${totalParts}` : "";
    const safeFilename = `${event.slug}-photo-bundle${partSuffix}.zip`;

    return new Response(Readable.toWeb(passThrough) as ReadableStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Bundle export error:", error);
    return NextResponse.json({ error: "Erro ao gerar arquivo ZIP" }, { status: 500 });
  }
}
