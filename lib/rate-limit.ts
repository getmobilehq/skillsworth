import "server-only";
import { headers } from "next/headers";

// Lightweight in-memory rate limiter (handoff §16 M5 hardening).
//
// CAVEAT: per-instance memory — on serverless/multi-instance hosting this is a
// best-effort throttle, not a global guarantee. For hard limits across
// instances, back this with Upstash/Redis or a Postgres counter. It still
// blunts accidental loops and single-instance bursts.
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** Returns true if the action is allowed; false if the limit is exceeded. */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}

/** Best-effort client IP from proxy headers, for use as a rate-limit key. */
export function clientIp(): string {
  const h = headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}
