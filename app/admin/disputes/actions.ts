"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

// Calibration-desk dispute handling (handoff §5). Admin-gated.

export async function assignDispute(disputeId: string): Promise<void> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  await db.from("disputes").update({ assigned_to: admin.id }).eq("id", disputeId);
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

  const db = createAdminClient();
  const { error } = await db
    .from("disputes")
    .update({
      status: "resolved",
      resolution,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", disputeId);
  if (error) return { error: error.message };
  revalidatePath("/admin/disputes");
  return {};
}
