import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, photos, tables } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getStorageProvider } from "@/lib/storage";
import { ZipArchive } from "archiver";
import { PassThrough } from "stream";

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

    const [event] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    }

    if (!verifyHostKey(request, event.hostKey)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Get all approved photos
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
      .where(and(eq(photos.eventId, event.id), eq(photos.status, "approved")));

    if (allPhotos.length === 0) {
      return NextResponse.json({ error: "Nenhuma foto aprovada para exportar." }, { status: 400 });
    }

    const storage = getStorageProvider();
    const passThrough = new PassThrough();
    const archive = new ZipArchive({ zlib: { level: 6 } });

    archive.on("error", (err) => {
      console.error("Archive error:", err);
      passThrough.destroy(err);
    });

    archive.pipe(passThrough);

    // Stream photos into archive in background
    (async () => {
      try {
        let index = 1;
        for (const item of allPhotos) {
          try {
            const stream = await storage.getFileStream(item.storagePath);
            const ext = item.storagePath.split(".").pop() || "jpg";
            const tableClean = (item.tableIdentifier || "Geral").replace(/[^a-zA-Z0-9_-]/g, "_");
            const nameClean = (item.guestName || "Anonimo").replace(/[^a-zA-Z0-9_-]/g, "_");
            const entryName = `fotos/${tableClean}_${nameClean}_${index.toString().padStart(4, "0")}.${ext}`;
            archive.append(stream, { name: entryName });
            index++;
          } catch (fileErr) {
            console.warn(`Could not read file for bundle: ${item.storagePath}`, fileErr);
          }
        }

        // Add a manifest text file with dedications
        const manifestLines = [
          `# ${event.title} - Livro de Recordações`,
          `Data de exportação: ${new Date().toISOString()}`,
          `Total de fotos: ${allPhotos.length}`,
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
        await archive.finalize();
      } catch (e) {
        console.error("Error archiving photos:", e);
      }
    })();

    // Convert PassThrough Node stream to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        passThrough.on("data", (chunk) => controller.enqueue(chunk));
        passThrough.on("end", () => controller.close());
        passThrough.on("error", (err) => controller.error(err));
      },
      cancel() {
        passThrough.destroy();
      },
    });

    const safeFilename = `${event.slug}-photo-bundle.zip`;

    return new Response(webStream, {
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
