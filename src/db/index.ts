import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
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
        CREATE TABLE IF NOT EXISTS photos (
          id TEXT PRIMARY KEY,
          event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          table_id TEXT REFERENCES tables(id) ON DELETE SET NULL,
          guest_name TEXT,
          message TEXT,
          storage_path TEXT NOT NULL,
          url TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'approved',
          created_at TIMESTAMP NOT NULL
        );
      `;

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
            title: "Casamento de Caio & Sarah",
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
      }
    } catch (error) {
      console.error("Database schema initialization warning:", error);
      initPromise = null;
    }
  })();

  return initPromise;
}
