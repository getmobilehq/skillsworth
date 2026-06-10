import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Placeholder for the signup gate (M0 — handoff §9: email/password + phone OTP,
// women attestation, versioned consent → profiles + consent record).
// Not yet implemented; this stub keeps the hook CTA from dead-linking.
export default function SignupPage() {
  return (
    <main className="flex min-h-screen justify-center">
      <div className="w-full max-w-app bg-white px-[22px] pb-[30px] pt-[26px]">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-green underline"
        >
          <ArrowLeft size={14} /> Back
        </Link>
        <h1 className="mt-6 font-display text-[28px] font-extrabold text-deep">
          Join Skill Worth.
        </h1>
        <p className="mt-2 text-[13.5px] leading-[1.45] text-muted">
          Signup gate coming in M0 — email + password, phone OTP, women
          attestation, and versioned consent. See the build plan in CLAUDE.md.
        </p>
      </div>
    </main>
  );
}
