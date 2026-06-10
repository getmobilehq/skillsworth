"use client";

import { useFormState, useFormStatus } from "react-dom";
import { ShieldCheck, Check } from "lucide-react";
import { AppShell, Eyebrow, Label, Card, Button, ErrorText } from "@/components/ui";
import { submitReport, type ReportState } from "./actions";

export default function SafeguardingForm() {
  const [state, formAction] = useFormState<ReportState, FormData>(
    submitReport,
    {},
  );

  if (state.sent)
    return (
      <AppShell minScreen>
        <Card tone="wash" className="pop mt-10">
          <div className="flex items-center gap-2">
            <Check size={18} className="text-green" />
            <span className="font-display text-[20px] font-extrabold text-deep">
              Thank you. We’ve received it.
            </span>
          </div>
          <p className="mt-2 text-[13.5px] leading-[1.5] text-ink">
            Your report has been logged confidentially and independently. If you
            left a way to reach you, someone from the safeguarding team may follow
            up. You are not alone.
          </p>
        </Card>
      </AppShell>
    );

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} className="text-green" />
        <Eyebrow>Confidential & independent</Eyebrow>
      </div>
      <h1 className="mt-2 font-display text-[26px] font-extrabold text-deep">
        Report a safety concern.
      </h1>
      <p className="mt-2 text-[13.5px] leading-[1.5] text-muted">
        This channel is anonymous and independent of any employer or operator.
        You don’t need an account, and you don’t have to share who you are. Tell
        us what happened and we’ll look into it.
      </p>

      <form action={formAction} className="mt-5 flex flex-col gap-[14px]">
        <div>
          <Label htmlFor="about">What happened?</Label>
          <textarea
            id="about"
            name="about"
            required
            className="min-h-[120px] w-full resize-none rounded-field border-[1.5px] border-[#DCE6E0] p-3 text-[14px] outline-none focus:border-green"
            placeholder="Describe the concern in your own words…"
          />
        </div>
        <div>
          <Label htmlFor="operator">Who or where? (optional)</Label>
          <input
            id="operator"
            name="operator"
            className="w-full rounded-field border-[1.5px] border-[#DCE6E0] px-[14px] py-[13px] text-[15px] outline-none focus:border-green"
            placeholder="An operator, a person, a place…"
          />
        </div>
        <div>
          <Label htmlFor="contact">How can we reach you back? (optional)</Label>
          <input
            id="contact"
            name="contact"
            className="w-full rounded-field border-[1.5px] border-[#DCE6E0] px-[14px] py-[13px] text-[15px] outline-none focus:border-green"
            placeholder="Email or phone — only if you want a reply"
          />
        </div>
        <ErrorText>{state.error}</ErrorText>
        <SubmitButton />
        <p className="text-[11.5px] leading-[1.4] text-muted">
          In immediate danger? Please contact local emergency services first.
        </p>
      </form>
    </AppShell>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <ShieldCheck size={16} /> {pending ? "Sending…" : "Send confidentially"}
    </Button>
  );
}
