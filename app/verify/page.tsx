import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VerifyForm from "./verify-form";

/** Mask all but the last 4 digits: +2348030000000 → +234 ••• ••0000. */
function maskPhone(phone: string): string {
  const last4 = phone.slice(-4);
  return `+234 ••• ••${last4}`;
}

export default async function VerifyPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signup");

  const { data: profile } = await supabase
    .from("profiles")
    .select("phone, phone_verified")
    .eq("id", user.id)
    .single();

  if (!profile?.phone) redirect("/signup");
  if (profile.phone_verified) redirect("/skills");

  return <VerifyForm maskedPhone={maskPhone(profile.phone)} />;
}
