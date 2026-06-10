"use client";

import { useFormState, useFormStatus } from "react-dom";
import { ErrorText } from "@/components/ui";
import { resolveDispute, type ResolveState } from "./actions";

export default function ResolveForm({ disputeId }: { disputeId: string }) {
  const [state, formAction] = useFormState<ResolveState, FormData>(
    resolveDispute,
    {},
  );
  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2">
      <input type="hidden" name="disputeId" value={disputeId} />
      <textarea
        name="resolution"
        placeholder="Resolution note (e.g. band upheld / upgraded to Certified after review)"
        className="min-h-[60px] w-full resize-none rounded-field border-[1.5px] border-[#DCE6E0] p-3 text-[13px] outline-none focus:border-green"
      />
      <ErrorText>{state.error}</ErrorText>
      <ResolveButton />
    </form>
  );
}

function ResolveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start rounded-btn bg-green px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-45"
    >
      {pending ? "Resolving…" : "Mark resolved"}
    </button>
  );
}
