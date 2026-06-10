"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export type ReportState = { error?: string; sent?: boolean };

// Anonymous safeguarding report (handoff §13). No auth required; written via the
// service role. Rate-limited by IP to blunt spam.
export async function submitReport(
  _prev: ReportState,
  formData: FormData,
): Promise<ReportState> {
  if (!rateLimit(`safeguard:${clientIp()}`, 5, 60_000))
    return { error: "Too many reports just now. Please wait a moment and retry." };

  const about = String(formData.get("about") ?? "").trim();
  const operator = String(formData.get("operator") ?? "").trim() || null;
  const contact = String(formData.get("contact") ?? "").trim() || null;
  if (about.length < 10)
    return { error: "Please describe what happened so we can help." };

  const db = createAdminClient();
  const { error } = await db.from("safeguarding_reports").insert({
    about,
    operator,
    contact,
    status: "open",
  });
  if (error) return { error: "Something went wrong. Please try again." };
  return { sent: true };
}
