import "server-only";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

export type SessionUser = { id: string; email: string };

/** The signed-in user (any verification state), or null. */
export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) return null;
  return { id: session.user.id, email: session.user.email };
}

/** Signed-in user + their profile row (or null profile if not yet written). */
export async function currentUserWithProfile() {
  const user = await currentUser();
  if (!user) return null;
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  });
  return { user, profile: profile ?? null };
}

// Returns the signed-in, phone-verified user, or null. Used to gate play and
// funnel actions (handoff §9 — verification precedes scoring/routing). This is
// the ownership anchor that replaced RLS: callers filter by `user.id`.
export async function currentVerifiedUser(): Promise<SessionUser | null> {
  const r = await currentUserWithProfile();
  if (!r?.profile?.phone_verified) return null;
  return r.user;
}
