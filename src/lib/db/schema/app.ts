import { relations, sql } from "drizzle-orm";
import {
  check,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import {
  AI_USAGE_KINDS,
  APPLICATION_STATUSES,
  EVENT_SOURCES,
  MAIL_ACTIONS,
  MAIL_KINDS,
  REMOTE_PREFERENCES,
  WORK_MODES,
} from "@/features/board/constants";

import { type StoredInterviewQuestions } from "@/features/interview/schemas";
import { type StoredMatchComment } from "@/features/match/schemas";

import { user } from "./auth";

export const applicationStatus = pgEnum("application_status", APPLICATION_STATUSES);
export const workMode = pgEnum("work_mode", WORK_MODES);
export const remotePreference = pgEnum("remote_preference", REMOTE_PREFERENCES);
export const aiUsageKind = pgEnum("ai_usage_kind", AI_USAGE_KINDS);
export const eventSource = pgEnum("event_source", EVENT_SOURCES);
export const mailKind = pgEnum("mail_kind", MAIL_KINDS);
export const mailAction = pgEnum("mail_action", MAIL_ACTIONS);

/**
 * Fractional index keys ("Zz" < "a0" < "a1") must compare byte by byte. Database default
 * collations (e.g. en_US) ignore case and would put "Zz" after "a0", so the column is "C".
 */
const orderKey = customType<{ data: string }>({
  dataType: () => 'text COLLATE "C"',
});

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

/** One row per user: what the AI compares offers against. */
export const profiles = pgTable(
  "profiles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    yearsExperience: smallint("years_experience"),
    skills: text("skills")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    salaryMin: integer("salary_min"),
    remotePreference: remotePreference("remote_preference").notNull().default("any"),
    bio: text("bio"),
    ...timestamps,
  },
  (t) => [check("profiles_years_experience_range", sql`${t.yearsExperience} between 0 and 60`)],
);

/** A job application = one card on the board. */
export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: applicationStatus("status").notNull().default("saved"),
    /** Fractional index key: order of the card inside its column (ADR planned for Day 3). */
    position: orderKey("position").notNull(),
    company: text("company").notNull(),
    role: text("role").notNull(),
    seniority: text("seniority"),
    stack: text("stack")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    workMode: workMode("work_mode").notNull().default("remote"),
    city: text("city"),
    redFlags: jsonb("red_flags").$type<string[]>().notNull().default([]),
    rawOffer: text("raw_offer"),
    /** Computed in code from the profile (scoreMatch, ADR 011), not by the AI. */
    matchScore: smallint("match_score"),
    /** Last AI comments on the match, one per tone. */
    matchComment: jsonb("match_comment").$type<StoredMatchComment>(),
    roastComment: jsonb("roast_comment").$type<StoredMatchComment>(),
    /** Last AI interview prep for this offer (flashcards + questions for the employer). */
    interviewQuestions: jsonb("interview_questions").$type<StoredInterviewQuestions>(),
    /** Optimistic concurrency: bumped on every change; a move must name the version it saw. */
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (t) => [
    // The board query: all cards of one user, grouped by column, in order.
    index("applications_user_status_position_idx").on(t.userId, t.status, t.position),
    check("applications_match_score_range", sql`${t.matchScore} between 0 and 100`),
    check(
      "applications_salary_order",
      sql`${t.salaryMin} is null or ${t.salaryMax} is null or ${t.salaryMin} <= ${t.salaryMax}`,
    ),
  ],
);

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    /** Denormalised owner, so every query can filter by the session user directly. */
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("notes_application_idx").on(t.applicationId)],
);

/**
 * Stage history: one row every time a card enters a stage (created in it, dragged or edited into
 * it). The statistics need it: a rejected card may have had an interview, and the time to an
 * answer is the gap between "applied" and the next stage.
 */
export const applicationEvents = pgTable(
  "application_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    /** Denormalised owner, so every query can filter by the session user directly. */
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: applicationStatus("status").notNull(),
    /** "timeout" moves are silence, not an answer: the statistics leave them out of answer time. */
    source: eventSource("source").notNull().default("board"),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("application_events_user_created_idx").on(t.userId, t.createdAt)],
);

/**
 * A user's mail connection (ADR 017): a personal token the Gmail script sends with every batch
 * (only its SHA-256 hash is stored) and the auto-reject setting.
 */
export const mailConnections = pgTable("mail_connections", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  /** The last characters of the token, so the user can recognise it in the settings. */
  tokenHint: text("token_hint").notNull(),
  /** Cards sent this many days ago without an answer move to "rejected"; null = never. */
  autoRejectDays: smallint("auto_reject_days").default(30),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  createdAt: timestamps.createdAt,
});

/**
 * One row per recruitment e-mail the script sent: what it was and what Huntboard did. The body
 * is never stored. `previousStatus` makes "Cofnij" possible.
 */
export const mailMessages = pgTable(
  "mail_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Gmail's message id: the same e-mail sent twice is processed once. */
    messageId: text("message_id").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    sender: text("sender").notNull(),
    subject: text("subject").notNull(),
    kind: mailKind("kind").notNull(),
    action: mailAction("action").notNull(),
    company: text("company"),
    role: text("role"),
    applicationId: uuid("application_id").references(() => applications.id, {
      onDelete: "set null",
    }),
    previousStatus: applicationStatus("previous_status"),
    newStatus: applicationStatus("new_status"),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    unique("mail_messages_user_message_unique").on(t.userId, t.messageId),
    index("mail_messages_user_created_idx").on(t.userId, t.createdAt),
  ],
);

/** One row per AI call (reserved before the call, tokens filled in after): limits and cost. */
export const aiUsage = pgTable(
  "ai_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: aiUsageKind("kind").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    // Per-user hourly limit (ADR 010).
    index("ai_usage_user_created_idx").on(t.userId, t.createdAt),
    // Daily budget across all users.
    index("ai_usage_created_idx").on(t.createdAt),
  ],
);

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  user: one(user, { fields: [applications.userId], references: [user.id] }),
  notes: many(notes),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  application: one(applications, { fields: [notes.applicationId], references: [applications.id] }),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(user, { fields: [profiles.userId], references: [user.id] }),
}));

export type ApplicationRow = typeof applications.$inferSelect;
export type NewApplicationRow = typeof applications.$inferInsert;
export type ApplicationEventRow = typeof applicationEvents.$inferSelect;
export type NewApplicationEventRow = typeof applicationEvents.$inferInsert;
export type MailMessageRow = typeof mailMessages.$inferSelect;
export type ProfileRow = typeof profiles.$inferSelect;
export type NewProfileRow = typeof profiles.$inferInsert;
