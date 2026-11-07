import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import {
  AI_USAGE_KINDS,
  APPLICATION_STATUSES,
  REMOTE_PREFERENCES,
  WORK_MODES,
} from "@/features/board/constants";

import { user } from "./auth";

export const applicationStatus = pgEnum("application_status", APPLICATION_STATUSES);
export const workMode = pgEnum("work_mode", WORK_MODES);
export const remotePreference = pgEnum("remote_preference", REMOTE_PREFERENCES);
export const aiUsageKind = pgEnum("ai_usage_kind", AI_USAGE_KINDS);

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
    position: text("position").notNull(),
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
    matchScore: smallint("match_score"),
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

/** Token usage per AI call: cost tracking and per-user limits (Day 6). */
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
  (t) => [index("ai_usage_user_created_idx").on(t.userId, t.createdAt)],
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
export type ProfileRow = typeof profiles.$inferSelect;
export type NewProfileRow = typeof profiles.$inferInsert;
