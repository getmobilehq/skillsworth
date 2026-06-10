"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Sparkles } from "lucide-react";
import { Label, Field, Button, ErrorText } from "@/components/ui";
import { CATEGORIES } from "@/lib/categories";
import { createSkill, type AdminFormState } from "./actions";

export default function NewSkillForm() {
  const [state, formAction] = useFormState<AdminFormState, FormData>(
    createSkill,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-[14px]">
      <div>
        <Label htmlFor="name">Skill name</Label>
        <Field id="name" name="name" placeholder="e.g. Python, SQL, UX design" required />
      </div>
      <div>
        <Label htmlFor="category">Category</Label>
        <select
          id="category"
          name="category"
          className="w-full rounded-field border-[1.5px] border-[#DCE6E0] bg-white px-[14px] py-[13px] text-[15px] text-ink outline-none focus:border-green"
          defaultValue="Software development"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <ErrorText>{state.error}</ErrorText>
      <SubmitButton />
      <p className="text-[12px] text-muted">
        Generates a 4-level scaffold, naira bands, and a draft question pool.
        This calls Anthropic and can take a moment. Nothing goes live until you
        approve it.
      </p>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Sparkles size={16} />
      {pending ? "Generating draft bank…" : "Generate skill bank"}
    </Button>
  );
}
