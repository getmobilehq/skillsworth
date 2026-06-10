import { createBrowserClient } from "@supabase/ssr";

// Browser Supabase client — anon key only. Never use the service role here.
// Reads only what RLS allows; `questions.correct_index` is never reachable. (handoff §4, §7)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
