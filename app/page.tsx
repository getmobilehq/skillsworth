import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import SiteFooter from "@/components/site-footer";

// Hook screen — ports the prototype's "hook" screen (prove-your-worth.jsx).
// Carries a referral code (?ref) through to signup for raffle bonus entries.
export default function Home({
  searchParams,
}: {
  searchParams: { ref?: string };
}) {
  const signupHref = searchParams.ref
    ? `/signup?ref=${encodeURIComponent(searchParams.ref)}`
    : "/signup";
  return (
    <main className="flex min-h-screen justify-center">
      <div className="relative w-full max-w-app overflow-hidden bg-white shadow-[0_0_0_1px_rgba(0,73,49,0.06)]">
        <div className="flex min-h-screen flex-col px-[22px] pb-[30px] pt-[26px]">
          <div className="flex items-center justify-between">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="TTS Nigeria" className="h-10 w-10" />
            <span className="inline-flex items-center gap-[5px] rounded-full bg-green-50 px-[10px] py-1 text-[11px] font-semibold text-deep">
              <Sparkles size={12} /> Skill Worth
            </span>
          </div>

          <div className="mt-[54px]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-green">
              What is your skill worth?
            </div>
            <h1 className="mt-3 font-display text-[46px] font-extrabold leading-[1.02] tracking-[-0.01em] text-deep">
              Prove
              <br />
              your worth.
            </h1>
            <p className="mt-4 text-base leading-[1.5] text-muted">
              The average female Python developer in Nigeria earns{" "}
              <b className="text-deep">₦300k a month</b>. Think you can match it?
              Don&rsquo;t tell us &mdash; <b className="text-deep">prove it.</b>
            </p>
          </div>

          <div className="mt-[26px] rounded-card border-[1.5px] border-yellow bg-cream p-[18px]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-deep">
              How it works
            </div>
            <p className="mt-2 text-[13.5px] leading-[1.5] text-ink">
              Create your account once. Pick any skill, take a live, timed test,
              and see what you&rsquo;re really worth. Clear Level 3 and
              you&rsquo;re in Friday&rsquo;s raffle.
            </p>
          </div>

          <Link
            href={signupHref}
            className="btn-primary mt-auto flex w-full items-center justify-center gap-2 rounded-btn bg-green px-[18px] py-[15px] text-[15px] font-semibold text-white transition active:translate-y-px"
          >
            Start &mdash; prove your worth <ArrowRight size={17} />
          </Link>

          <div className="font-display py-[18px] text-center text-xs font-bold italic text-green">
            Dignified Work for a Digital Future.
          </div>
          <SiteFooter />
        </div>
      </div>
    </main>
  );
}
