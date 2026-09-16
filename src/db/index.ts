import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and } from "drizzle-orm";
import * as schema from "./schema";
import crypto from "crypto";

// Fallback to placeholder to prevent Next.js build-time module evaluation from crashing
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://placeholder:placeholder@ep-placeholder.neon.tech/neondb?sslmode=require";

export const sql = neon(connectionString);
export const db = drizzle(sql, { schema });

let initPromise: Promise<void> | null = null;

/**
 * Ensures required PostgreSQL tables exist and seeds the flagship wedding event if empty.
 * Runs idempotently and caches initialization in memory per serverless execution context.
 */
export async function ensureSchema(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    return;
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
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
        CREATE TABLE IF NOT EXISTS photo_quests (
          id TEXT PRIMARY KEY,
          event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          description TEXT,
          icon TEXT DEFAULT '🎯',
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP NOT NULL
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS photos (
          id TEXT PRIMARY KEY,
          event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          table_id TEXT REFERENCES tables(id) ON DELETE SET NULL,
          quest_id TEXT REFERENCES photo_quests(id) ON DELETE SET NULL,
          quest_title TEXT,
          guest_name TEXT,
          guest_session_id TEXT,
          message TEXT,
          media_type TEXT NOT NULL DEFAULT 'photo',
          storage_path TEXT NOT NULL,
          url TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'approved',
          created_at TIMESTAMP NOT NULL
        );
      `;

      // Safe idempotent migrations executed individually
      await sql`ALTER TABLE photos ADD COLUMN IF NOT EXISTS guest_session_id TEXT`;
      await sql`ALTER TABLE photos ADD COLUMN IF NOT EXISTS quest_id TEXT`;
      await sql`ALTER TABLE photos ADD COLUMN IF NOT EXISTS quest_title TEXT`;
      await sql`ALTER TABLE photos ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'photo'`;
      await sql`ALTER TABLE photos ADD COLUMN IF NOT EXISTS moment TEXT`;
      await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS moments_config TEXT`;

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

      await sql`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY,
          event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          guest_session_id TEXT NOT NULL,
          guest_name TEXT NOT NULL,
          table_identifier TEXT,
          message TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL
        );
      `;

      // Check if flagship event exists, if not seed it
      const existing = await db.select().from(schema.events).limit(1);
      if (existing.length === 0) {
        const eventId = crypto.randomUUID();
        const hostKey = "amor2026"; // Memorable host key for Caio & Sarah
        const now = new Date();

        await db
          .insert(schema.events)
          .values({
            id: eventId,
            slug: "caio-e-sarah",
            title: "Caio & Sarah",
            hostKey,
            moderationPolicy: "immediate",
            isUploadClosed: false,
            createdAt: now,
          });

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
          await db
            .insert(schema.tables)
            .values({
              id: crypto.randomUUID(),
              eventId,
              identifier: table,
              createdAt: now,
            });
        }
      } else {
        // Ensure flagship title is updated if previously seeded with old title
        await db
          .update(schema.events)
          .set({ title: "Caio & Sarah" })
          .where(
            and(
              eq(schema.events.slug, "caio-e-sarah"),
              eq(schema.events.title, "Casamento de Caio & Sarah")
            )
          );
      }

      // Ensure default photo quests exist for each event
      const allEvents = await db.select().from(schema.events);
      const defaultWeddingQuests = [
        { icon: "🥂", title: "O Brinde da Mesa", description: "Faça um brinde animado com todo mundo na sua mesa!" },
        { icon: "💍", title: "Momento com os Noivos", description: "Aquele abraço ou foto especial com Sarah & Caio." },
        { icon: "🕺", title: "Rei ou Rainha da Pista", description: "O passo de dança mais criativo da festa!" },
        { icon: "😄", title: "Sorriso Espontâneo", description: "A melhor gargalhada ou momento descontraído." },
        { icon: "🍰", title: "Doce Tentação", description: "O bolo, os docinhos ou aquele detalhe delicioso." },
        { icon: "👗", title: "Look da Noite", description: "Aquele traje ou detalhe estiloso de alguém na festa." },
        { icon: "📸", title: "Grande Selfie Coletiva", description: "Junte o máximo de amigos em uma foto só!" },
      ];

      for (const ev of allEvents) {
        const existingQuests = await db
          .select()
          .from(schema.photoQuests)
          .where(eq(schema.photoQuests.eventId, ev.id));
        if (existingQuests.length === 0) {
          const now = new Date();
          for (const q of defaultWeddingQuests) {
            await db.insert(schema.photoQuests).values({
              id: crypto.randomUUID(),
              eventId: ev.id,
              title: q.title,
              description: q.description,
              icon: q.icon,
              isActive: true,
              createdAt: now,
            });
          }
        }
      }
    } catch (error) {
      console.error("Database schema initialization warning:", error);
      initPromise = null;
    }
  })();

  return initPromise;
}
