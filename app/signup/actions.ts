"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth, authErrorMessage } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { sendPhoneOtp } from "@/lib/otp";
import { CONSENT_VERSION, normalizePhoneNG } from "@/lib/account";
import { isUuid } from "@/lib/ids";

export type SignupState = { error?: string };

// Creates the one-time account, writes the profile + versioned consent, and
// triggers the phone OTP. (handoff §9, §13)
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
  const referredBy = isUuid(refRaw) ? refRaw : null;

  // Server-side validation (never trust the client).
  if (!first || !email) return { error: "Please add your name and email." };
  if (password.length < 6)
    return { error: "Password must be at least 6 characters." };
  const phone = normalizePhoneNG(phoneRaw);
  if (!phone) return { error: "Enter a valid Nigerian phone number." };
  if (!attested || !consent)
    return { error: "Please confirm the attestation and consent to continue." };

  let userId: string;
  try {
    const res = await auth.api.signUpEmail({
      body: { email, password, name: `${first} ${last}`.trim() },
      headers: headers(),
    });
    userId = res.user.id;
  } catch (e) {
    return { error: authErrorMessage(e, "We couldn’t create your account. Try again.") };
  }

  // Write profile + versioned consent (phone still unverified). A referrer id
  // that doesn't exist would fail the FK, so fall back to no referrer.
  const row = {
    id: userId,
    first_name: first,
    last_name: last,
    phone,
    phone_verified: false,
    is_woman_attested: attested,
    consent_at: new Date().toISOString(),
    consent_version: CONSENT_VERSION,
    referred_by: referredBy,
  };
  try {
    await db.insert(profiles).values(row);
  } catch {
    try {
      await db.insert(profiles).values({ ...row, referred_by: null });
    } catch {
      return { error: "We couldn’t save your details. Please try again." };
    }
  }

  const otpError = await sendPhoneOtp(phone);
  if (otpError) return { error: otpError };

  redirect("/verify");
}
