import "server-only";

// Transactional email via Resend (handoff §5). SERVER ONLY. Uses the HTTP API
// directly (no SDK dependency). No-ops when RESEND_API_KEY is unset so the
// funnel still works in dev — callers must not depend on delivery.
const FROM = "TTS Nigeria <noreply@tts.ng>";

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !opts.to) return { ok: false };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      }),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

export function communityWelcomeHtml(firstName: string): string {
  const name = firstName?.trim() || "there";
  return `<div style="font-family:Inter,system-ui,sans-serif;color:#0E0F0F">
    <h2 style="color:#004931">Welcome to the TTS Community, ${name}!</h2>
    <p>You've taken the first step toward match-ready, dignified work. We'll be in
    touch soon with free training, your first workshop, and placement support as
    you level up.</p>
    <p style="color:#00B75B;font-weight:600">Dignified Work for a Digital Future.</p>
  </div>`;
}
