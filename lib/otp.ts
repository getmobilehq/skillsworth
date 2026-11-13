import "server-only";

// Phone OTP via Twilio Verify's REST API (handoff §9). Twilio generates, sends,
// and checks the code — we never see or store it.
//
// Env (server only): TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID.
//
// Local dev without Twilio: when those are unset AND NODE_ENV !== "production",
// sending is a no-op and the fixed code 123456 verifies (mirrors the old
// Supabase [auth.sms.test_otp] setup). In production, missing creds is an error
// — we never silently accept codes.

const DEV_CODE = "123456";

function creds() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const service = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!sid || !token || !service) return null;
  return { sid, token, service };
}

function devMode(): boolean {
  return !creds() && process.env.NODE_ENV !== "production";
}

async function twilio(path: string, params: Record<string, string>) {
  const c = creds();
  if (!c) throw new Error("SMS verification isn’t configured.");
  const res = await fetch(
    `https://verify.twilio.com/v2/Services/${c.service}/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${c.sid}:${c.token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params),
      cache: "no-store",
    },
  );
  const json = (await res.json().catch(() => ({}))) as { status?: string; message?: string };
  return { ok: res.ok, status: res.status, json };
}

/** Send a code to an E.164 phone. Returns an error message, or null on success. */
export async function sendPhoneOtp(phone: string): Promise<string | null> {
  if (devMode()) return null;
  try {
    const r = await twilio("Verifications", { To: phone, Channel: "sms" });
    if (!r.ok) {
      // Log status only — never the phone number (handoff §13: no PII in logs).
      console.error("[otp] send failed", r.status);
      return "We couldn’t send a code to that number. Check it and try again.";
    }
    return null;
  } catch {
    return "We couldn’t send a code right now. Please try again.";
  }
}

/** True if the code is valid for this phone. */
export async function checkPhoneOtp(phone: string, code: string): Promise<boolean> {
  if (devMode()) return code === DEV_CODE;
  try {
    const r = await twilio("VerificationCheck", { To: phone, Code: code });
    return r.ok && r.json.status === "approved";
  } catch {
    return false;
  }
}
