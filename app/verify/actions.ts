"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signup");

  const { data: profile } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", user.id)
    .single();
  if (!profile?.phone)
    return { error: "No pending phone found. Please sign up again." };

  const { error } = await supabase.auth.verifyOtp({
    phone: profile.phone,
    token,
    type: "phone_change",
  });
  if (error) return { error: "That code doesn’t match. Try again." };

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ phone_verified: true })
    .eq("id", user.id);
  if (updateError) return { error: updateError.message };

  redirect("/skills");
}

// Resends the OTP to the profile's pending phone. Plain form action (void).
export async function resendOtp(): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signup");

  const { data: profile } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", user.id)
    .single();
  if (!profile?.phone) return;

  await supabase.auth.updateUser({ phone: profile.phone });
}
