"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export type LoginState = { error?: string };

// Returning-user login — email/password, no OTP (handoff §9).
export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || password.length < 6)
    return { error: "Enter your email and password." };

  try {
    await auth.api.signInEmail({ body: { email, password }, headers: headers() });
  } catch {
    return { error: "Email or password is incorrect." };
  }

  redirect("/skills");
}

export async function signOut(): Promise<void> {
  try {
    await auth.api.signOut({ headers: headers() });
  } catch {
    // Already signed out — fine.
  }
  redirect("/");
}
