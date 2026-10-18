import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Fallback to placeholder to prevent Next.js build-time module evaluation from crashing.
// The schema itself is managed outside the request path: `npm run db:push` syncs
// src/db/schema.ts to the database and `npm run db:setup` seeds the flagship Event.
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://placeholder:placeholder@ep-placeholder.neon.tech/neondb?sslmode=require";

export const sql = neon(connectionString);
export const db = drizzle(sql, { schema });
