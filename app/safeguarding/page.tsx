import type { Metadata } from "next";
import SafeguardingForm from "./safeguarding-form";

// Public — no auth. Available throughout the programme (handoff §13).
export const metadata: Metadata = {
  title: "Report a safety concern — TTS Nigeria",
  description:
    "A confidential, independent channel to report a safety concern. No account needed.",
};

export default function SafeguardingPage() {
  return <SafeguardingForm />;
}
