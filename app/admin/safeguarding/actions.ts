"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { safeguarding_reports } from "@/lib/db/schema";

export type ReviewState = { error?: string };

export async function markReviewed(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!id) return { error: "Missing report." };

  await db
    .update(safeguarding_reports)
    .set({
      status: "reviewed",
      note: note || null,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .where(eq(safeguarding_reports.id, id));
  revalidatePath("/admin/safeguarding");
  return {};
}
