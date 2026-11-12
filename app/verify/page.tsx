import { redirect } from "next/navigation";
import { currentUserWithProfile } from "@/lib/current-user";
import VerifyForm from "./verify-form";

/** Mask all but the last 4 digits: +2348030000000 → +234 ••• ••0000. */
function maskPhone(phone: string): string {
  const last4 = phone.slice(-4);
  return `+234 ••• ••${last4}`;
}

export default async function VerifyPage() {
  const r = await currentUserWithProfile();
  if (!r) redirect("/signup");

  const profile = r.profile;
  if (!profile?.phone) redirect("/signup");
  if (profile.phone_verified) redirect("/skills");

  return <VerifyForm maskedPhone={maskPhone(profile.phone)} />;
}
