// Supabase "Send SMS" auth hook → eBulkSMS (Nigerian SMS provider).
//
// Supabase Auth generates the OTP, then POSTs { user, sms:{ otp } } here. We
// verify the webhook signature, then deliver the code via eBulkSMS's JSON API.
// This overrides Supabase's built-in SMS providers, which don't support eBulkSMS.
//
// Deploy (from the project root, after `supabase link`):
//   supabase functions deploy send-sms --no-verify-jwt
// Set the function secrets (NOT in the app's .env — these live in Supabase):
//   supabase secrets set \
//     SEND_SMS_HOOK_SECRET="v1,whsec_..."  # generated when you add the hook \
//     EBULKSMS_USERNAME="you@example.com"   # your eBulkSMS login (NOT the key) \
//     EBULKSMS_APIKEY="..."                 # your eBulkSMS API key \
//     EBULKSMS_SENDER="SkillWorth"          # sender id, <=11 alphanumeric
// Then: Dashboard → Authentication → Hooks → Send SMS → enable, point it at this
// function's URL; copy the generated secret into SEND_SMS_HOOK_SECRET above.

import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const HOOK_SECRET = Deno.env.get("SEND_SMS_HOOK_SECRET") ?? "";
const EBULK_USERNAME = Deno.env.get("EBULKSMS_USERNAME") ?? "";
const EBULK_APIKEY = Deno.env.get("EBULKSMS_APIKEY") ?? "";
const EBULK_SENDER = Deno.env.get("EBULKSMS_SENDER") ?? "SkillWorth";

const EBULK_ENDPOINT = "https://api.ebulksms.com/sendsms.json";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const raw = await req.text();

  // 1) Verify the request really came from Supabase Auth (Standard Webhooks).
  let user: { phone?: string };
  let sms: { otp?: string };
  try {
    const wh = new Webhook(HOOK_SECRET.replace("v1,whsec_", ""));
    const headers = {
      "webhook-id": req.headers.get("webhook-id") ?? "",
      "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
      "webhook-signature": req.headers.get("webhook-signature") ?? "",
    };
    ({ user, sms } = wh.verify(raw, headers) as {
      user: { phone?: string };
      sms: { otp?: string };
    });
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response(JSON.stringify({ error: "invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const otp = sms?.otp;
  // eBulkSMS wants the number in full international format WITHOUT the leading
  // '+' (e.g. 2348030000000); Supabase provides '+2348030000000'.
  const msisdn = (user?.phone ?? "").replace(/^\+/, "");
  if (!otp || !msisdn) {
    return new Response(JSON.stringify({ error: "missing phone or otp" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2) Deliver via eBulkSMS.
  const body = {
    SMS: {
      auth: { username: EBULK_USERNAME, apikey: EBULK_APIKEY },
      message: {
        sender: EBULK_SENDER,
        messagetext: `Your TTS Skill Worth code is ${otp}. It expires shortly. Do not share it.`,
        flash: "0",
      },
      recipients: { gsm: [{ msidn: msisdn, msgid: crypto.randomUUID() }] },
      dndsender: "0",
    },
  };

  let providerStatus = "";
  try {
    const res = await fetch(EBULK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    // eBulkSMS returns { response: { status: "SUCCESS", ... } } on success.
    providerStatus = text;
    let ok = res.ok;
    try {
      ok = ok && JSON.parse(text)?.response?.status === "SUCCESS";
    } catch {
      ok = false; // non-JSON (often a 500 plain-text error) = failure
    }
    if (!ok) {
      console.error("eBulkSMS rejected the send:", providerStatus);
      return new Response(
        JSON.stringify({ error: "sms provider error", detail: providerStatus }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }
  } catch (err) {
    console.error("eBulkSMS request failed:", err);
    return new Response(JSON.stringify({ error: "sms request failed" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3) Empty 200 = success (per Supabase send-sms hook contract).
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
