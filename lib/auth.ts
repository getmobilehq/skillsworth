import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import { user, session, account, verification } from "@/lib/db/schema";

// Better Auth — email + password sessions, stored in Neon. (handoff §9)
//
// Deliberately NO /api/auth route handler: every auth call goes through our own
// server actions (signup/login/verify) via `auth.api.*`. That keeps the signup
// gate (women attestation + versioned consent + profile write) un-bypassable —
// a public /api/auth/sign-up endpoint would let accounts be created around it.
//
// Phone verification is NOT a Better Auth concern here: it's a profile
// attribute checked with Twilio Verify (lib/otp.ts), same as before.
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    autoSignIn: true,
    requireEmailVerification: false, // phone OTP is the verification step
  },
  advanced: {
    database: { generateId: "uuid" }, // profiles.id is a uuid FK to user.id
  },
  // Must be last: lets auth.api.* set session cookies from Server Actions.
  plugins: [nextCookies()],
});

/** Message from a Better Auth APIError (or any error), for form display. */
export function authErrorMessage(e: unknown, fallback: string): string {
  if (e && typeof e === "object") {
    const body = (e as { body?: { message?: string } }).body;
    if (body?.message) return body.message;
    if ("message" in e && typeof e.message === "string" && e.message) return e.message;
  }
  return fallback;
}
