import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, Eyebrow } from "@/components/ui";
import NewSkillForm from "./new-skill-form";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-cream text-deep",
  calibrated: "bg-green-50 text-deep",
  live: "bg-green text-white",
};

export default async function AdminHome() {
  await requireAdmin();
  const db = createAdminClient();
  const { data: skills } = await db
    .from("skills")
    .select("id, name, category, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-8">
      <section>
        <Eyebrow>New skill</Eyebrow>
        <h1 className="mb-4 mt-1 font-display text-[26px] font-extrabold text-deep">
          Generate a skill bank.
        </h1>
        <NewSkillForm />
      </section>

      <section>
        <h2 className="mb-3 font-display text-[20px] font-extrabold text-deep">
          Skills
        </h2>
        {!skills?.length ? (
          <Card tone="plain">
            <p className="text-[13.5px] text-muted">
              No skills yet. Generate one above.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {skills.map((s) => (
              <Link
                key={s.id}
                href={`/admin/skills/${s.id}`}
                className="flex items-center justify-between rounded-card border-[1.5px] border-[#DCE6E0] bg-white px-[16px] py-[14px] transition hover:border-green"
              >
                <span>
                  <span className="text-[15px] font-semibold text-deep">
                    {s.name}
                  </span>
                  <span className="ml-2 text-[12.5px] text-muted">
                    {s.category}
                  </span>
                </span>
                <span
                  className={`rounded-full px-[10px] py-1 text-[11px] font-semibold uppercase tracking-wide ${
                    STATUS_STYLE[s.status] ?? "bg-[#EEF3F0] text-muted"
                  }`}
                >
                  {s.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
