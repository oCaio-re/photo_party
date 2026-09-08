import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const dbPath = path.resolve(process.cwd(), "photo_party.db");
const sqlite = new Database(dbPath);

// Enable WAL mode for high concurrency
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Ensure tables exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    host_key TEXT NOT NULL,
    moderation_policy TEXT NOT NULL DEFAULT 'immediate',
    upload_deadline INTEGER,
    is_upload_closed INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tables (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    identifier TEXT NOT NULL,
    qr_code_data_url TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    table_id TEXT REFERENCES tables(id) ON DELETE SET NULL,
    guest_name TEXT,
    message TEXT,
    storage_path TEXT NOT NULL,
    url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'approved',
    created_at INTEGER NOT NULL
  );
`);

export const db = drizzle(sqlite, { schema });

// Auto-seed flagship event if no events exist
function seedFlagshipEvent() {
  const existing = db.select().from(schema.events).limit(1).all();
  if (existing.length === 0) {
    const eventId = crypto.randomUUID();
    const hostKey = "amor2026"; // Default memorable host key for the flagship wedding
    const now = new Date();

    db.insert(schema.events)
      .values({
        id: eventId,
        slug: "caio-e-sarah",
        title: "Casamento de Caio & Sarah",
        hostKey,
        moderationPolicy: "immediate",
        isUploadClosed: false,
        createdAt: now,
      })
      .onConflictDoNothing()
      .run();

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

    for (const table of initialTables) {
      db.insert(schema.tables)
        .values({
          id: crypto.randomUUID(),
          eventId,
          identifier: table,
          createdAt: now,
        })
        .onConflictDoNothing()
        .run();
    }
  }
}

seedFlagshipEvent();
