import Link from "next/link";
import { ShieldCheck } from "lucide-react";

// Shared footer. The safeguarding link is available throughout the programme
// (handoff §13). The Mastercard Foundation appears in body copy, never a
// headline, and is never abbreviated (§13).
export default function SiteFooter() {
  return (
    <footer className="mt-6 border-t border-[#EEF3F0] pt-4 text-center">
      <Link
        href="/safeguarding"
        className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-deep underline"
      >
        <ShieldCheck size={14} className="text-green" /> Report a safety concern
      </Link>
      <p className="mt-3 text-[11px] leading-[1.5] text-muted">
        Delivered by TTS Nigeria in partnership with the Mastercard Foundation.
        Your data is used only to assess and match you, and you can withdraw at
        any time.
      </p>
    </footer>
  );
}
