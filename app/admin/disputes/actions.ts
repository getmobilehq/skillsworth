"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { disputes } from "@/lib/db/schema";

// Calibration-desk dispute handling (handoff §5). Admin-gated.

export async function assignDispute(disputeId: string): Promise<void> {
  const admin = await requireAdmin();
  await db.update(disputes).set({ assigned_to: admin.id }).where(eq(disputes.id, disputeId));
  revalidatePath("/admin/disputes");
}

export type ResolveState = { error?: string };

export async function resolveDispute(
  _prev: ResolveState,
  formData: FormData,
): Promise<ResolveState> {
  await requireAdmin();
  const disputeId = String(formData.get("disputeId") ?? "");
  const resolution = String(formData.get("resolution") ?? "").trim();
  if (!disputeId || !resolution)
    return { error: "Add a resolution note." };

  await db
    .update(disputes)
    .set({ status: "resolved", resolution, resolved_at: new Date().toISOString() })
    .where(eq(disputes.id, disputeId));
  revalidatePath("/admin/disputes");
  return {};
}
