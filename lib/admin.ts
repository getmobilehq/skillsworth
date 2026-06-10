import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

// Gate for admin/calibration routes (handoff §8). Verifies the signed-in user
// is flagged is_admin BEFORE any service-role operation runs. Call at the top
// of every admin page and action.
export async function requireAdmin(): Promise<User> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");
  return user;
}
