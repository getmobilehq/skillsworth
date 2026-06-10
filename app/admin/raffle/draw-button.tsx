"use client";

import { useState, useTransition } from "react";
import { Trophy } from "lucide-react";
import { Button, ErrorText } from "@/components/ui";
import { runDraw } from "./actions";

export default function DrawButton() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | undefined>();

  return (
    <div>
      <Button
        variant="dark"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await runDraw();
            setError(res.error);
          })
        }
      >
        <Trophy size={16} /> {pending ? "Drawing…" : "Run Friday draw"}
      </Button>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
