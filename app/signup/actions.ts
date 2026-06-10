"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CONSENT_VERSION, normalizePhoneNG } from "@/lib/account";

export type SignupState = { error?: string };

// Creates the one-time account, writes the profile + versioned consent, and
// triggers the phone OTP. (handoff §9, §13)
//
// Assumes the Supabase project has email confirmation OFF (phone is the
// verification step, not email) so signUp returns a session we can write
// profiles under RLS. See CLAUDE.md → Supabase project setup.
export async function signup(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const first = String(formData.get("first") ?? "").trim();
  const last = String(formData.get("last") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const phoneRaw = String(formData.get("phone") ?? "");
  const attested = formData.get("attested") === "on";
  const consent = formData.get("consent") === "on";
  const refRaw = String(formData.get("ref") ?? "").trim();
  // Only accept a well-formed UUID as a referrer (§9).
  const referredBy = /^[0-9a-f-]{36}$/i.test(refRaw) ? refRaw : null;

  // Server-side validation (never trust the client).
  if (!first || !email) return { error: "Please add your name and email." };
  if (password.length < 6)
    return { error: "Password must be at least 6 characters." };
  const phone = normalizePhoneNG(phoneRaw);
  if (!phone) return { error: "Enter a valid Nigerian phone number." };
  if (!attested || !consent)
    return { error: "Please confirm the attestation and consent to continue." };

  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { first_name: first, last_name: last } },
  });
  if (error) return { error: error.message };
  const userId = data.user?.id;
  if (!userId || !data.session)
    return {
      error:
        "Account created but no session — check that email confirmation is disabled in Supabase.",
    };

  // Write profile + versioned consent (phone still unverified).
  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    first_name: first,
    last_name: last,
    phone,
    phone_verified: false,
    is_woman_attested: attested,
    consent_at: new Date().toISOString(),
    consent_version: CONSENT_VERSION,
    referred_by: referredBy,
  });
  if (profileError) return { error: profileError.message };

  // Trigger SMS OTP for phone verification (sends a 'phone_change' code).
  const { error: otpError } = await supabase.auth.updateUser({ phone });
  if (otpError) return { error: otpError.message };

  redirect("/verify");
}
