import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attempts, disputes as disputesTable, skills } from "@/lib/db/schema";
import { Card, Eyebrow } from "@/components/ui";
import { assignDispute } from "./actions";
import ResolveForm from "./resolve-form";

type DisputeRow = {
  id: string;
  type: string;
  note: string | null;
  status: string;
  assigned_to: string | null;
  resolution: string | null;
  created_at: string;
  attempts: {
    reached_level: number;
    band_label: string | null;
    tier: string | null;
    skills: { name: string } | null;
  } | null;
};

export default async function DisputesPage() {
  await requireAdmin();
  const rows = await db
    .select({
      id: disputesTable.id,
      type: disputesTable.type,
      note: disputesTable.note,
      status: disputesTable.status,
      assigned_to: disputesTable.assigned_to,
      resolution: disputesTable.resolution,
      created_at: disputesTable.created_at,
      reached_level: attempts.reached_level,
      band_label: attempts.band_label,
      tier: attempts.tier,
      skill_name: skills.name,
    })
    .from(disputesTable)
    .leftJoin(attempts, eq(attempts.id, disputesTable.attempt_id))
    .leftJoin(skills, eq(skills.id, attempts.skill_id))
    .orderBy(desc(disputesTable.created_at));

  const disputes: DisputeRow[] = rows.map((r) => ({
    id: r.id,
    type: r.type,
    note: r.note,
    status: r.status ?? "open",
    assigned_to: r.assigned_to,
    resolution: r.resolution,
    created_at: r.created_at ?? "",
    attempts:
      r.reached_level == null
        ? null
        : {
            reached_level: r.reached_level,
            band_label: r.band_label,
            tier: r.tier,
            skills: r.skill_name ? { name: r.skill_name } : null,
          },
  }));
  const open = disputes.filter((d) => d.status === "open");
  const resolved = disputes.filter((d) => d.status !== "open");

  return (
    <div className="flex flex-col gap-7">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-green underline"
        >
          <ArrowLeft size={14} /> All skills
        </Link>
        <h1 className="mt-3 font-display text-[26px] font-extrabold text-deep">
          Disputes
        </h1>
        <p className="text-[13px] text-muted">
          Human-review requests from players. The current band stands until you
          resolve.
        </p>
      </div>

      <section>
        <Eyebrow>Open · {open.length}</Eyebrow>
        <div className="mt-2 flex flex-col gap-3">
          {!open.length && (
            <Card tone="plain">
              <p className="text-[13.5px] text-muted">No open disputes.</p>
            </Card>
          )}
          {open.map((d) => (
            <Card key={d.id} tone="cream">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-bold text-deep">
                  {d.attempts?.skills?.name ?? "Unknown skill"}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {d.type}
                </span>
              </div>
              <p className="mt-1 text-[12px] text-muted">
                Reached level {d.attempts?.reached_level ?? "—"} · Band{" "}
                {d.attempts?.band_label ?? "—"} · Tier {d.attempts?.tier ?? "—"}
              </p>
              {d.note && (
                <p className="mt-2 rounded-field bg-white/60 p-3 text-[13.5px] leading-[1.45] text-ink">
                  “{d.note}”
                </p>
              )}
              <div className="mt-3 flex items-center gap-2">
                {!d.assigned_to && (
                  <form action={assignDispute.bind(null, d.id)}>
                    <button className="rounded-btn border-[1.5px] border-green px-3 py-1.5 text-[12px] font-semibold text-deep">
                      Assign to me
                    </button>
                  </form>
                )}
                {d.assigned_to && (
                  <span className="text-[11.5px] font-semibold text-green">
                    Assigned
                  </span>
                )}
              </div>
              <ResolveForm disputeId={d.id} />
            </Card>
          ))}
        </div>
      </section>

      {resolved.length > 0 && (
        <section>
          <Eyebrow>Resolved · {resolved.length}</Eyebrow>
          <div className="mt-2 flex flex-col gap-2">
            {resolved.map((d) => (
              <Card key={d.id} tone="plain">
                <div className="flex items-center justify-between">
                  <span className="text-[13.5px] font-semibold text-deep">
                    {d.attempts?.skills?.name ?? "Unknown skill"}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-green">
                    resolved
                  </span>
                </div>
                {d.resolution && (
                  <p className="mt-1 text-[12.5px] text-muted">{d.resolution}</p>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
