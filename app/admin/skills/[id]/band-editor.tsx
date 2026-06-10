"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateBand, type AdminFormState } from "@/app/admin/actions";
import { ErrorText } from "@/components/ui";

export type BandRow = {
  id: string;
  level: number;
  label: string | null;
  naira_low: number | null;
  naira_high: number | null;
};

export default function BandEditor({
  band,
  skillId,
}: {
  band: BandRow;
  skillId: string;
}) {
  const [state, formAction] = useFormState<AdminFormState, FormData>(
    updateBand,
    {},
  );

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-2 border-b border-[#EEF3F0] py-3"
    >
      <input type="hidden" name="bandId" value={band.id} />
      <input type="hidden" name="skillId" value={skillId} />
      <span className="w-6 text-[13px] font-bold text-deep">L{band.level}</span>
      <input
        name="label"
        defaultValue={band.label ?? ""}
        placeholder="Label"
        className="w-32 rounded-field border-[1.5px] border-[#DCE6E0] px-3 py-2 text-[13px] outline-none focus:border-green"
      />
      <input
        name="naira_low"
        type="number"
        defaultValue={band.naira_low ?? ""}
        placeholder="Low ₦"
        className="w-28 rounded-field border-[1.5px] border-[#DCE6E0] px-3 py-2 text-[13px] outline-none focus:border-green"
      />
      <input
        name="naira_high"
        type="number"
        defaultValue={band.naira_high ?? ""}
        placeholder="High ₦"
        className="w-28 rounded-field border-[1.5px] border-[#DCE6E0] px-3 py-2 text-[13px] outline-none focus:border-green"
      />
      <SaveButton />
      <ErrorText>{state.error}</ErrorText>
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-btn border-[1.5px] border-green px-3 py-2 text-[13px] font-semibold text-deep disabled:opacity-45"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}
