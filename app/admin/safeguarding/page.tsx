import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, Eyebrow } from "@/components/ui";
import ReviewForm from "./review-form";

type Report = {
  id: string;
  about: string;
  operator: string | null;
  contact: string | null;
  status: string;
  note: string | null;
  created_at: string;
};

export default async function AdminSafeguardingPage() {
  await requireAdmin();
  const db = createAdminClient();
  const { data } = await db
    .from("safeguarding_reports")
    .select("id, about, operator, contact, status, note, created_at")
    .order("created_at", { ascending: false });

  const reports = (data ?? []) as Report[];
  const open = reports.filter((r) => r.status === "open");
  const reviewed = reports.filter((r) => r.status !== "open");

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
          Safeguarding
        </h1>
        <p className="text-[13px] text-muted">
          Confidential reports. Handle with care and independence from operators.
        </p>
      </div>

      <section>
        <Eyebrow>Open · {open.length}</Eyebrow>
        <div className="mt-2 flex flex-col gap-3">
          {!open.length && (
            <Card tone="plain">
              <p className="text-[13.5px] text-muted">No open reports.</p>
            </Card>
          )}
          {open.map((r) => (
            <Card key={r.id} tone="cream">
              <p className="text-[14px] leading-[1.5] text-ink">{r.about}</p>
              {(r.operator || r.contact) && (
                <p className="mt-2 text-[12px] text-muted">
                  {r.operator ? `Re: ${r.operator}` : ""}
                  {r.operator && r.contact ? " · " : ""}
                  {r.contact ? `Contact: ${r.contact}` : ""}
                </p>
              )}
              <ReviewForm id={r.id} />
            </Card>
          ))}
        </div>
      </section>

      {reviewed.length > 0 && (
        <section>
          <Eyebrow>Reviewed · {reviewed.length}</Eyebrow>
          <div className="mt-2 flex flex-col gap-2">
            {reviewed.map((r) => (
              <Card key={r.id} tone="plain">
                <p className="text-[13px] text-ink">{r.about}</p>
                {r.note && (
                  <p className="mt-1 text-[12px] text-green">{r.note}</p>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
