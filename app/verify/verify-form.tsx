"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { AppShell, Eyebrow, Field, Button, ErrorText } from "@/components/ui";
import { verifyOtp, resendOtp, type VerifyState } from "./actions";

export default function VerifyForm({ maskedPhone }: { maskedPhone: string }) {
  const [state, formAction] = useFormState<VerifyState, FormData>(
    verifyOtp,
    {},
  );

  return (
    <AppShell minScreen>
      <Eyebrow>Step 2 · Verify your phone</Eyebrow>
      <h1 className="mt-2 font-display text-[28px] font-extrabold text-deep">
        Enter your code.
      </h1>
      <p className="mt-2 text-[13.5px] leading-[1.45] text-muted">
        We sent a 6-digit code to <b className="text-deep">{maskedPhone}</b>.
        Enter it to confirm it&rsquo;s really you.
      </p>

      <form action={formAction}>
        <Field
          name="token"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          placeholder="••••••"
          className="mt-[22px] text-center font-display text-[22px] font-bold tracking-[0.5em]"
          required
        />
        <ErrorText>{state.error}</ErrorText>
        <SubmitButton />
      </form>

      <form action={resendOtp} className="mt-[14px] text-center">
        <button
          type="submit"
          className="text-[13px] font-semibold text-green underline"
        >
          Resend code
        </button>
      </form>
    </AppShell>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-[18px]">
      {pending ? "Verifying…" : "Verify & continue"}
      {!pending && <Check size={16} />}
    </Button>
  );
}
