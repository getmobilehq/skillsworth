"use client";

import { useFormState, useFormStatus } from "react-dom";
import { ArrowRight } from "lucide-react";
import {
  AppShell,
  Eyebrow,
  Label,
  Field,
  Button,
  ErrorText,
  TextLink,
} from "@/components/ui";
import { login, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, formAction] = useFormState<LoginState, FormData>(login, {});

  return (
    <AppShell>
      <Eyebrow>Welcome back</Eyebrow>
      <h1 className="mt-2 font-display text-[28px] font-extrabold text-deep">
        Log in.
      </h1>
      <p className="mt-2 text-[13.5px] leading-[1.45] text-muted">
        Your email is your username.
      </p>

      <form action={formAction} className="mt-5 flex flex-col gap-[14px]">
        <div>
          <Label htmlFor="email">Email</Label>
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
            placeholder="Your password"
            required
          />
        </div>
        <ErrorText>{state.error}</ErrorText>
        <SubmitButton />
      </form>

      <p className="mt-4 text-center text-[13px] text-muted">
        New here? <TextLink href="/signup">Create an account</TextLink>
      </p>
    </AppShell>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-2">
      {pending ? "Logging in…" : "Log in"}
      {!pending && <ArrowRight size={16} />}
    </Button>
  );
}
