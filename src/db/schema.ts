import { pgTable, text, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  hostKey: text("host_key").notNull(),
  moderationPolicy: text("moderation_policy", {
    enum: ["immediate", "approval_required"],
  })
    .notNull()
    .default("immediate"),
  uploadDeadline: timestamp("upload_deadline", { mode: "date" }),
  isUploadClosed: boolean("is_upload_closed")
    .notNull()
    .default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
});

export const tables = pgTable("tables", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  identifier: text("identifier").notNull(), // e.g. "Mesa 1", "Mesa dos Noivos"
  qrCodeDataUrl: text("qr_code_data_url"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
});

export const photos = pgTable("photos", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  tableId: text("table_id").references(() => tables.id, {
    onDelete: "set null",
  }),
  guestName: text("guest_name"),
  guestSessionId: text("guest_session_id"),
  message: text("message"),
  storagePath: text("storage_path").notNull(),
  url: text("url").notNull(),
  status: text("status", {
    enum: ["approved", "pending", "hidden"],
  })
    .notNull()
    .default("approved"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
});

export const photoLikes = pgTable(
  "photo_likes",
  {
    id: text("id").primaryKey(),
    photoId: text("photo_id")
      .notNull()
      .references(() => photos.id, { onDelete: "cascade" }),
    guestSessionId: text("guest_session_id").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("photo_likes_photo_guest_idx").on(table.photoId, table.guestSessionId),
  ]
);

export const photoComments = pgTable("photo_comments", {
  id: text("id").primaryKey(),
  photoId: text("photo_id")
    .notNull()
    .references(() => photos.id, { onDelete: "cascade" }),
  guestSessionId: text("guest_session_id").notNull(),
  guestName: text("guest_name").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
});

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Table = typeof tables.$inferSelect;
export type NewTable = typeof tables.$inferInsert;
export type Photo = typeof photos.$inferSelect;
export type NewPhoto = typeof photos.$inferInsert;
export type PhotoLike = typeof photoLikes.$inferSelect;
export type NewPhotoLike = typeof photoLikes.$inferInsert;
export type PhotoComment = typeof photoComments.$inferSelect;
export type NewPhotoComment = typeof photoComments.$inferInsert;

