import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { DEFAULT_WEDDING_QUESTS } from "../src/lib/default-quests.ts";

// Try loading .env if DATABASE_URL is not in process.env
if (!process.env.DATABASE_URL) {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const match = line.match(/^\s*DATABASE_URL\s*=\s*["']?(.*?)["']?\s*$/);
      if (match) {
        process.env.DATABASE_URL = match[1];
        break;
      }
    }
  }
}

if (!process.env.DATABASE_URL) {
  console.error("❌ ERRO: DATABASE_URL não encontrada no ambiente nem no arquivo .env");
  console.error("👉 Obtenha sua Connection String no console do Neon (https://console.neon.tech)");
  console.error("👉 Adicione ao arquivo .env:");
  console.error('   DATABASE_URL="postgresql://usuario:senha@ep-xyz.regiao.aws.neon.tech/neondb?sslmode=require"');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

/**
 * Seeds data only. The table structure lives in src/db/schema.ts and is applied with
 * `npm run db:push` (drizzle-kit), which must run before this script.
 */
async function setup() {
  console.log("🚀 Conectando ao Neon PostgreSQL...");

  const [{ exists }] = await sql`SELECT to_regclass('public.events') IS NOT NULL AS exists;`;
  if (!exists) {
    console.error("❌ Tabelas não encontradas. Rode primeiro: npm run db:push");
    process.exit(1);
  }

  const events = await sql`SELECT id FROM events WHERE slug = 'caio-e-sarah' LIMIT 1;`;
  if (events.length === 0) {
    console.log("💍 Semeando evento de destaque: Caio & Sarah...");
    const eventId = crypto.randomUUID();
    const hostKey = process.env.FLAGSHIP_HOST_KEY || crypto.randomBytes(16).toString("hex");
    const now = new Date();

    await sql`
      INSERT INTO events (id, slug, title, host_key, moderation_policy, is_upload_closed, created_at)
      VALUES (${eventId}, 'caio-e-sarah', 'Caio & Sarah', ${hostKey}, 'immediate', FALSE, ${now});
    `;

    const initialTables = [
      "Mesa dos Noivos",
      "Mesa 1",
      "Mesa 2",
      "Mesa 3",
      "Mesa 4",
      "Mesa 5",
      "Mesa 6",
      "Mesa 7",
      "Mesa 8",
    ];

    for (const t of initialTables) {
      await sql`
        INSERT INTO tables (id, event_id, identifier, created_at)
        VALUES (${crypto.randomUUID()}, ${eventId}, ${t}, ${now});
      `;
    }
    console.log("✅ Evento 'caio-e-sarah' e mesas iniciais criados com sucesso!");
    console.log(`🔑 Host Key do evento: ${hostKey}`);
  } else {
    console.log("ℹ️ Evento 'caio-e-sarah' já existe.");
  }

  // Every Event starts with the default Photo Quests
  const eventsWithoutQuests = await sql`
    SELECT e.id FROM events e
    WHERE NOT EXISTS (SELECT 1 FROM photo_quests q WHERE q.event_id = e.id);
  `;
  for (const ev of eventsWithoutQuests) {
    const now = new Date();
    for (const q of DEFAULT_WEDDING_QUESTS) {
      await sql`
        INSERT INTO photo_quests (id, event_id, title, description, icon, is_active, created_at)
        VALUES (${crypto.randomUUID()}, ${ev.id}, ${q.title}, ${q.description}, ${q.icon}, TRUE, ${now});
      `;
    }
  }
  if (eventsWithoutQuests.length > 0) {
    console.log(`🎯 Desafios padrão criados para ${eventsWithoutQuests.length} evento(s).`);
  }

  console.log("🎉 Banco de dados Neon 100% pronto para uso!");
}

setup().catch((err) => {
  console.error("❌ Falha na configuração do banco Neon:", err);
  process.exit(1);
});
