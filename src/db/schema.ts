import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  hostKey: text("host_key").notNull(),
  moderationPolicy: text("moderation_policy", {
    enum: ["immediate", "approval_required"],
  })
    .notNull()
    .default("immediate"),
  uploadDeadline: integer("upload_deadline", { mode: "timestamp" }),
  isUploadClosed: integer("is_upload_closed", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const tables = sqliteTable("tables", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  identifier: text("identifier").notNull(), // e.g. "Mesa 1", "Mesa dos Noivos"
  qrCodeDataUrl: text("qr_code_data_url"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const photos = sqliteTable("photos", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  tableId: text("table_id").references(() => tables.id, {
    onDelete: "set null",
  }),
  guestName: text("guest_name"),
  message: text("message"),
  storagePath: text("storage_path").notNull(),
  url: text("url").notNull(),
  status: text("status", {
    enum: ["approved", "pending", "hidden"],
  })
    .notNull()
    .default("approved"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Table = typeof tables.$inferSelect;
export type NewTable = typeof tables.$inferInsert;
export type Photo = typeof photos.$inferSelect;
export type NewPhoto = typeof photos.$inferInsert;
