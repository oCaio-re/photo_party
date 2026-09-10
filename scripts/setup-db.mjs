import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";
import crypto from "crypto";

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

async function setup() {
  console.log("🚀 Conectando ao Neon PostgreSQL...");

  console.log("📦 Criando tabelas se não existirem...");

  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      host_key TEXT NOT NULL,
      moderation_policy TEXT NOT NULL DEFAULT 'immediate',
      upload_deadline TIMESTAMP,
      is_upload_closed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tables (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      identifier TEXT NOT NULL,
      qr_code_data_url TEXT,
      created_at TIMESTAMP NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      table_id TEXT REFERENCES tables(id) ON DELETE SET NULL,
      guest_name TEXT,
      guest_session_id TEXT,
      message TEXT,
      storage_path TEXT NOT NULL,
      url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved',
      created_at TIMESTAMP NOT NULL
    );
  `;

  await sql`ALTER TABLE photos ADD COLUMN IF NOT EXISTS guest_session_id TEXT;`;
  await sql`ALTER TABLE photos ADD COLUMN IF NOT EXISTS moment TEXT;`;
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS moments_config TEXT;`;

  await sql`
    CREATE TABLE IF NOT EXISTS photo_likes (
      id TEXT PRIMARY KEY,
      photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
      guest_session_id TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL,
      UNIQUE(photo_id, guest_session_id)
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS photo_comments (
      id TEXT PRIMARY KEY,
      photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
      guest_session_id TEXT NOT NULL,
      guest_name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL
    );
  `;

  console.log("✅ Tabelas verificadas/criadas com sucesso!");

  // Verify flagship event
  const events = await sql`SELECT id, slug, title FROM events WHERE slug = 'caio-e-sarah' LIMIT 1;`;
  if (events.length === 0) {
    console.log("💍 Semeando evento de destaque: Casamento de Caio & Sarah...");
    const eventId = crypto.randomUUID();
    const hostKey = "amor2026";
    const now = new Date();

    await sql`
      INSERT INTO events (id, slug, title, host_key, moderation_policy, is_upload_closed, created_at)
      VALUES (${eventId}, 'caio-e-sarah', 'Casamento de Caio & Sarah', ${hostKey}, 'immediate', FALSE, ${now});
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
      const tableId = crypto.randomUUID();
      await sql`
        INSERT INTO tables (id, event_id, identifier, created_at)
        VALUES (${tableId}, ${eventId}, ${t}, ${now});
      `;
    }
    console.log("✅ Evento 'caio-e-sarah' e mesas iniciais criados com sucesso!");
  } else {
    console.log("ℹ️ Evento 'caio-e-sarah' já existente no banco de dados.");
  }

  console.log("🎉 Banco de dados Neon 100% pronto para uso!");
}

setup().catch((err) => {
  console.error("❌ Falha na configuração do banco Neon:", err);
  process.exit(1);
});
