import { pgTable, text, boolean, timestamp, unique, index } from "drizzle-orm/pg-core";

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  // Constraint names match the ones the original raw-SQL setup created, so db:push keeps them
  slug: text("slug").notNull().unique("events_slug_key"),
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
  momentsConfig: text("moments_config"),
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
}, (table) => [index("tables_event_idx").on(table.eventId)]);

export const photoQuests = pgTable("photo_quests", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  icon: text("icon").default("🎯"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
}, (table) => [index("photo_quests_event_idx").on(table.eventId)]);

export const photos = pgTable("photos", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  tableId: text("table_id").references(() => tables.id, {
    onDelete: "set null",
  }),
  questId: text("quest_id").references(() => photoQuests.id, {
    onDelete: "set null",
  }),
  questTitle: text("quest_title"),
  guestName: text("guest_name"),
  guestSessionId: text("guest_session_id"),
  message: text("message"),
  mediaType: text("media_type").notNull().default("photo"),
  storagePath: text("storage_path").notNull(),
  url: text("url").notNull(),
  status: text("status", {
    enum: ["approved", "pending", "hidden"],
  })
    .notNull()
    .default("approved"),
  moment: text("moment"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
}, (table) => [
  // Gallery/slideshow listing: WHERE event_id = ? AND status = ? ORDER BY created_at DESC
  index("photos_event_status_created_idx").on(table.eventId, table.status, table.createdAt),
]);

/**
 * Storage keys handed out by /upload/presign but not yet confirmed. Confirming requires
 * a row here (binding the key to its Event); rows left behind are abandoned uploads
 * whose files the cleanup cron deletes.
 */
export const pendingUploads = pgTable("pending_uploads", {
  key: text("key").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
}, (table) => [index("pending_uploads_created_idx").on(table.createdAt)]);

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
    unique("photo_likes_photo_id_guest_session_id_key").on(table.photoId, table.guestSessionId),
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
}, (table) => [index("photo_comments_photo_created_idx").on(table.photoId, table.createdAt)]);

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  guestSessionId: text("guest_session_id").notNull(),
  guestName: text("guest_name").notNull(),
  tableIdentifier: text("table_identifier"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
}, (table) => [index("chat_messages_event_created_idx").on(table.eventId, table.createdAt)]);

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
export type PhotoQuest = typeof photoQuests.$inferSelect;
export type NewPhotoQuest = typeof photoQuests.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;

