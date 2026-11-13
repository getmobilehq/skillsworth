"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { currentUserWithProfile } from "@/lib/current-user";
import { checkPhoneOtp, sendPhoneOtp } from "@/lib/otp";
import { rateLimit } from "@/lib/rate-limit";

export type VerifyState = { error?: string };

// Verifies the phone OTP and marks the profile phone_verified. (handoff §9)
// The phone is read server-side from the profile — never passed via the URL or
// trusted from the client (handoff §13: no PII in URLs).
export async function verifyOtp(
  _prev: VerifyState,
  formData: FormData,
): Promise<VerifyState> {
  const token = String(formData.get("token") ?? "").replace(/\D/g, "");
  if (token.length < 6) return { error: "Enter the 6-digit code." };

  const r = await currentUserWithProfile();
  if (!r) redirect("/signup");
  const phone = r.profile?.phone;
  if (!phone) return { error: "No pending phone found. Please sign up again." };

  // Throttle guesses per user (best-effort; see lib/rate-limit caveat).
  if (!rateLimit(`otp-check:${r.user.id}`, 5, 60_000))
    return { error: "Too many tries. Wait a minute and try again." };

  const ok = await checkPhoneOtp(phone, token);
  if (!ok) return { error: "That code doesn’t match. Try again." };

  await db
    .update(profiles)
    .set({ phone_verified: true })
    .where(eq(profiles.id, r.user.id));

  redirect("/skills");
}

// Resends the OTP to the profile's pending phone. Plain form action (void).
export async function resendOtp(): Promise<void> {
  const r = await currentUserWithProfile();
  if (!r) redirect("/signup");

  // Throttle resends per user (best-effort; see lib/rate-limit caveat).
  if (!rateLimit(`otp-resend:${r.user.id}`, 3, 60_000)) return;
  if (!r.profile?.phone) return;

  await sendPhoneOtp(r.profile.phone);
}
