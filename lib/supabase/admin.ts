import "server-only";
import { createClient } from "@supabase/supabase-js";

// SERVICE-ROLE client — bypasses RLS. SERVER ONLY. (handoff §4, §7)
//
// The ONLY path that may read questions.correct_index, write graded results,
// or run calibration/admin reads. The `server-only` import makes any accidental
// client-side import a build error. Guard every use behind an authz check.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
