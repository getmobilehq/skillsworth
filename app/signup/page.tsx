"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Check, Phone } from "lucide-react";
import {
  AppShell,
  Eyebrow,
  Label,
  Field,
  Button,
  ErrorText,
  TextLink,
} from "@/components/ui";
import { signup, type SignupState } from "./actions";

// Signup gate (handoff §9). Email = username; password + phone (OTP-verified);
// women attestation + versioned consent are required.
export default function SignupPage() {
  const [state, formAction] = useFormState<SignupState, FormData>(signup, {});
  // Referral code from the share-card link (?ref=<userId>), read client-side to
  // avoid a Suspense boundary; validated server-side.
  const [ref, setRef] = useState("");
  useEffect(() => {
    setRef(new URLSearchParams(window.location.search).get("ref") ?? "");
  }, []);

  return (
    <AppShell>
      <Eyebrow>Create your account · one time</Eyebrow>
      <h1 className="mt-2 font-display text-[28px] font-extrabold text-deep">
        Join Skill Worth.
      </h1>
      <p className="mt-2 text-[13.5px] leading-[1.45] text-muted">
        Sign up once with your email and phone. After that, just log in to prove
        new skills.
      </p>

      <form action={formAction} className="mt-5 flex flex-col gap-[14px]">
        <input type="hidden" name="ref" value={ref} />
        <div className="flex gap-[10px]">
          <div className="flex-1">
            <Label htmlFor="first">First name</Label>
            <Field id="first" name="first" placeholder="Amaka" required />
          </div>
          <div className="flex-1">
            <Label htmlFor="last">Last name</Label>
            <Field id="last" name="last" placeholder="Okafor" />
          </div>
        </div>
        <div>
          <Label htmlFor="email">Email (your username)</Label>
          <Field
            id="email"
            name="email"
            type="email"
            placeholder="amaka@email.com"
            required
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Field
            id="password"
            name="password"
            type="password"
            placeholder="At least 6 characters"
            required
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone (for verification)</Label>
          <Field
            id="phone"
            name="phone"
            type="tel"
            placeholder="0803 000 0000"
            required
          />
        </div>

        <label className="flex cursor-pointer items-start gap-[11px] rounded-field border-[1.5px] border-[#DCE6E0] bg-white px-[15px] py-[14px] text-[12.5px] leading-[1.4] has-[:checked]:border-green has-[:checked]:bg-green-50">
          <input
            type="checkbox"
            name="attested"
            className="mt-0.5 h-[18px] w-[18px] accent-green"
            required
          />
          <span>
            I&rsquo;m a woman in Nigeria, and I agree my answers can be used to
            assess and match me. <b>(Required)</b>
          </span>
        </label>
        {/* Consent feeds the RoPA (handoff §13); versioned server-side. */}
        <label className="flex cursor-pointer items-start gap-[11px] text-[12px] leading-[1.4] text-muted">
          <input
            type="checkbox"
            name="consent"
            className="mt-0.5 h-[16px] w-[16px] accent-green"
            required
          />
          <span>
            I consent to TTS Nigeria storing my details for this programme. I can
            withdraw or delete anytime.
          </span>
        </label>

        <ErrorText>{state.error}</ErrorText>
        <SubmitButton />
      </form>

      <p className="mt-4 text-center text-[13px] text-muted">
        Already have an account? <TextLink href="/login">Log in</TextLink>
      </p>
    </AppShell>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-2">
      <Phone size={16} /> {pending ? "Creating…" : "Create account & send code"}
      {!pending && <Check size={16} />}
    </Button>
  );
}
