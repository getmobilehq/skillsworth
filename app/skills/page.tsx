import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { AppShell, Eyebrow, Card, Button, Tagline } from "@/components/ui";

// Post-auth landing. M0 stub — the real skill pick + AI assessment lands in M2.
// Guards: must be signed in and phone-verified.
export default async function SkillsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, phone_verified")
    .eq("id", user.id)
    .single();

  if (!profile?.phone_verified) redirect("/verify");

  return (
    <AppShell minScreen>
      <Eyebrow>
        {profile.first_name ? `Hi ${profile.first_name} · ` : ""}What will you
        prove?
      </Eyebrow>
      <h1 className="mt-2 font-display text-[28px] font-extrabold text-deep">
        Pick a skill.
      </h1>

      <Card tone="cream" className="mt-5">
        <p className="text-[13.5px] leading-[1.5] text-ink">
          You&rsquo;re signed in and verified. The skill picker and live,
          AI-built assessment land in <b>M2</b> — see the build plan in
          CLAUDE.md.
        </p>
      </Card>

      <div className="mt-auto">
        <Button variant="primary" disabled className="mb-3">
          <Sparkles size={16} /> Build my assessment (coming in M2)
        </Button>
        <form action={signOut}>
          <Button type="submit" variant="ghost">
            Sign out
          </Button>
        </form>
      </div>
      <Tagline />
    </AppShell>
  );
}
