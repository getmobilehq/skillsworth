import "server-only";
import { redirect } from "next/navigation";
import { currentUserWithProfile, type SessionUser } from "@/lib/current-user";

// Gate for admin/calibration routes (handoff §8). Verifies the signed-in user
// is flagged is_admin BEFORE any privileged DB operation runs. Call at the top
// of every admin page and action — there is no RLS behind it.
export async function requireAdmin(): Promise<SessionUser> {
  const r = await currentUserWithProfile();
  if (!r) redirect("/login");
  if (!r.profile?.is_admin) redirect("/");
  return r.user;
}
