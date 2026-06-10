// Account/consent helpers shared by the auth flow (handoff §9, §13).

// Versioned consent string logged at signup → feeds the programme's RoPA.
// Bump when consent copy changes; never reuse a version for different wording.
export const CONSENT_VERSION = "2026-06-v1";

/**
 * Normalise a Nigerian phone entry to E.164 (+234…) for Supabase/Twilio OTP.
 * Accepts "0803 000 0000", "0803-000-0000", "+2348030000000", "2348030000000".
 * Returns null if it doesn't look like a valid NG mobile number.
 */
export function normalizePhoneNG(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  let local: string;
  if (digits.startsWith("234")) local = digits.slice(3);
  else if (digits.startsWith("0")) local = digits.slice(1);
  else local = digits;
  // NG mobile subscriber numbers are 10 digits (e.g. 803 000 0000).
  if (local.length !== 10) return null;
  return `+234${local}`;
}
