// Prove Your Worth — Postgres schema (handoff §7), on Neon via Drizzle.
//
// Ported from the former supabase/migrations/0001–0004. Two things changed:
//   1. Identity is Better Auth's `user` table (uuid ids), not Supabase auth.users.
//   2. There is NO row-level security. Authorization lives in server code:
//      every read/write runs on the server after `currentVerifiedUser()` /
//      `requireAdmin()` and filters by the caller's id. The DB connection is
//      server-only (lib/db/index.ts) — nothing here is reachable from a browser.
//
// TS keys deliberately mirror the snake_case column names so query results keep
// the same shape the app used under supabase-js. Timestamps use mode:"string".
//
// questions.correct_index is read in exactly two places: grading
// (app/play/actions.ts submitLevel) and the admin calibration desk. Never select
// it in a player-facing serve path.

import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  char,
  unique,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const ts = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "string" });
const created = (name = "created_at") => ts(name).defaultNow();
const pk = () => uuid("id").primaryKey().defaultRandom();

// ═══════════════════════════════════════════ Better Auth core tables
// Shape required by better-auth 1.x (user / session / account / verification).
// ids are uuids (advanced.database.generateId = "uuid" in lib/auth.ts).

export const user = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: uuid("id").primaryKey().defaultRandom(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: uuid("id").primaryKey().defaultRandom(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ═══════════════════════════════════════════ Identity (1:1 with user)

export const profiles = pgTable("profiles", {
  id: uuid("id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  first_name: text("first_name"),
  last_name: text("last_name"),
  phone: text("phone"),
  phone_verified: boolean("phone_verified").default(false),
  is_woman_attested: boolean("is_woman_attested").default(false),
  consent_at: ts("consent_at"),
  consent_version: text("consent_version"),
  is_admin: boolean("is_admin").default(false),
  referred_by: uuid("referred_by").references((): AnyPgColumn => profiles.id),
  created_at: created(),
});

// ═══════════════════════════════════════════ Skill catalogue (admin-curated)

export const skills = pgTable("skills", {
  id: pk(),
  name: text("name").notNull(),
  normalised_name: text("normalised_name"),
  category: text("category").notNull(),
  status: text("status").notNull().default("draft"), // draft | calibrated | live
  created_by: uuid("created_by"),
  created_at: created(),
});

export const skill_levels = pgTable("skill_levels", {
  id: pk(),
  skill_id: uuid("skill_id").references(() => skills.id, { onDelete: "cascade" }),
  level: integer("level").notNull(),
  name: text("name"),
  focus: text("focus"),
  time_seconds: integer("time_seconds").notNull(),
});

export const skill_bands = pgTable("skill_bands", {
  id: pk(),
  skill_id: uuid("skill_id").references(() => skills.id, { onDelete: "cascade" }),
  level: integer("level").notNull(),
  label: text("label"),
  naira_low: integer("naira_low"),
  naira_high: integer("naira_high"),
});

// ═══════════════════════════════════════════ Question bank

export const questions = pgTable("questions", {
  id: pk(),
  skill_id: uuid("skill_id").references(() => skills.id, { onDelete: "cascade" }),
  level: integer("level").notNull(),
  prompt: text("prompt").notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  correct_index: integer("correct_index").notNull(),
  rationale: text("rationale"),
  source: text("source").default("ai"), // ai | human
  status: text("status").default("draft"), // draft | approved | retired
  reviewed_by: uuid("reviewed_by"),
  version: integer("version").default(1),
  created_at: created(),
});

// ═══════════════════════════════════════════ One scored attempt / user / skill / week

export const attempts = pgTable(
  "attempts",
  {
    id: pk(),
    user_id: uuid("user_id").references(() => profiles.id, { onDelete: "cascade" }),
    skill_id: uuid("skill_id").references(() => skills.id),
    week_iso: text("week_iso").notNull(), // e.g. 2026-W24
    status: text("status").default("in_progress"), // in_progress | complete
    reached_level: integer("reached_level").notNull().default(0),
    score: integer("score").notNull().default(0),
    band_label: text("band_label"),
    tier: char("tier", { length: 1 }),
    started_at: created("started_at"),
    completed_at: ts("completed_at"),
  },
  // Enforces one scored run per user/skill/week (non-negotiable #5).
  (t) => [unique("attempts_user_skill_week").on(t.user_id, t.skill_id, t.week_iso)],
);

export const attempt_levels = pgTable(
  "attempt_levels",
  {
    id: pk(),
    attempt_id: uuid("attempt_id").references(() => attempts.id, { onDelete: "cascade" }),
    level: integer("level").notNull(),
    served_question_ids: uuid("served_question_ids").array(),
    answers: jsonb("answers").$type<number[]>(),
    correct_count: integer("correct_count"),
    time_used: integer("time_used"),
    passed: boolean("passed"),
    served_at: ts("served_at"),
    graded_at: ts("graded_at"),
  },
  // One row per attempt+level: makes the idempotent serve race-safe.
  (t) => [unique("attempt_levels_attempt_level").on(t.attempt_id, t.level)],
);

// ═══════════════════════════════════════════ Accept / dispute

export const disputes = pgTable("disputes", {
  id: pk(),
  attempt_id: uuid("attempt_id").references(() => attempts.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // reprove | review
  note: text("note"),
  status: text("status").default("open"), // open | resolved
  assigned_to: uuid("assigned_to"),
  resolution: text("resolution"),
  created_at: created(),
  resolved_at: ts("resolved_at"),
});

// ═══════════════════════════════════════════ Funnel routing + ERP/CRM sync

export const routings = pgTable("routings", {
  id: pk(),
  attempt_id: uuid("attempt_id")
    .unique()
    .references(() => attempts.id, { onDelete: "cascade" }),
  tier: char("tier", { length: 1 }),
  destination: text("destination"), // qtp | community | feedback
  synced_to_crm: boolean("synced_to_crm").default(false),
  crm_ref: text("crm_ref"),
  created_at: created(),
});

// ═══════════════════════════════════════════ L1/L2 community conversions

export const community_joins = pgTable("community_joins", {
  id: pk(),
  user_id: uuid("user_id").references(() => profiles.id),
  attempt_id: uuid("attempt_id").references(() => attempts.id),
  status: text("status").default("joined"),
  joined_at: created("joined_at"),
});

// ═══════════════════════════════════════════ Raffle entry mirror (entries live in raffu)

export const raffle_entries = pgTable("raffle_entries", {
  id: pk(),
  user_id: uuid("user_id").references(() => profiles.id),
  attempt_id: uuid("attempt_id").references(() => attempts.id),
  raffle_slug: text("raffle_slug"),
  raffu_entry_id: text("raffu_entry_id"),
  created_at: created(),
});

// ═══════════════════════════════════════════ Leaderboard (display-safe only)

export const leaderboard_entries = pgTable(
  "leaderboard_entries",
  {
    id: pk(),
    attempt_id: uuid("attempt_id")
      .unique()
      .references(() => attempts.id, { onDelete: "cascade" }),
    user_id: uuid("user_id").references(() => profiles.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    skill_name: text("skill_name").notNull(),
    display_name: text("display_name").notNull(),
    score: integer("score").notNull().default(0),
    reached_level: integer("reached_level").notNull().default(0),
    qualified: boolean("qualified").notNull().default(false), // Level 3+
    week_iso: text("week_iso").notNull(),
    updated_at: created("updated_at"),
  },
  (t) => [
    index("leaderboard_week_category_idx").on(
      t.week_iso,
      t.category,
      sql`${t.score} desc`,
    ),
  ],
);

export const raffle_winners = pgTable("raffle_winners", {
  id: pk(),
  week_iso: text("week_iso").notNull(),
  raffle_slug: text("raffle_slug").notNull(),
  category: text("category"),
  kind: text("kind").notNull(), // top | random
  display_name: text("display_name").notNull(),
  skill_name: text("skill_name"),
  score: integer("score"),
  created_at: created(),
});

// ═══════════════════════════════════════════ Anonymous safeguarding (§13)
// No FK to a user; contact details optional and reporter-supplied.

export const safeguarding_reports = pgTable("safeguarding_reports", {
  id: pk(),
  about: text("about").notNull(),
  operator: text("operator"),
  contact: text("contact"),
  status: text("status").notNull().default("open"), // open | reviewed
  reviewed_by: uuid("reviewed_by"),
  note: text("note"),
  created_at: created(),
  reviewed_at: ts("reviewed_at"),
});
