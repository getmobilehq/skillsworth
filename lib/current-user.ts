import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

// Returns the signed-in, phone-verified user, or null. Used to gate play and
// funnel actions (handoff §9 — verification precedes scoring/routing).
export async function currentVerifiedUser(): Promise<User | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("phone_verified")
    .eq("id", user.id)
    .single();
  if (!profile?.phone_verified) return null;
  return user;
}
