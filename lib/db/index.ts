import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

// Server-only Postgres connection (Neon in prod, any Postgres locally).
//
// This replaces BOTH Supabase clients: there is no "anon" vs "service role"
// split any more — the browser never talks to the database. Every query runs in
// a Server Component / Server Action after an authz check
// (currentVerifiedUser / requireAdmin), which is what RLS used to enforce.
//
// Use Neon's *pooled* connection string (…-pooler…) in DATABASE_URL on Netlify.
// The pool is cached on globalThis so dev HMR and warm function instances reuse it.

const globalForDb = globalThis as unknown as { pgPool?: Pool };

const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });
if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;

export const db = drizzle(pool, { schema });
export type DB = typeof db;
export { schema };
