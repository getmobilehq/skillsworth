"use client";

import { useState, useTransition } from "react";
import { Rocket } from "lucide-react";
import { Button, ErrorText } from "@/components/ui";
import { setSkillLive } from "@/app/admin/actions";

export default function SetLiveButton({
  skillId,
  isLive,
}: {
  skillId: string;
  isLive: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | undefined>();

  if (isLive)
    return (
      <div className="rounded-card bg-green-50 px-4 py-3 text-[13.5px] font-semibold text-deep">
        ✓ Live — served to players.
      </div>
    );

  return (
    <div>
      <Button
        variant="dark"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await setSkillLive(skillId);
            setError(result.error);
          })
        }
      >
        <Rocket size={16} /> {pending ? "Checking…" : "Set skill live"}
      </Button>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
