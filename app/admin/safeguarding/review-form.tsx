"use client";

import { useFormState, useFormStatus } from "react-dom";
import { ErrorText } from "@/components/ui";
import { markReviewed, type ReviewState } from "./actions";

export default function ReviewForm({ id }: { id: string }) {
  const [state, formAction] = useFormState<ReviewState, FormData>(
    markReviewed,
    {},
  );
  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <input
        name="note"
        placeholder="Outcome / action taken (optional)"
        className="w-full rounded-field border-[1.5px] border-[#DCE6E0] px-3 py-2 text-[13px] outline-none focus:border-green"
      />
      <ErrorText>{state.error}</ErrorText>
      <Btn />
    </form>
  );
}

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start rounded-btn bg-green px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-45"
    >
      {pending ? "Saving…" : "Mark reviewed"}
    </button>
  );
}
