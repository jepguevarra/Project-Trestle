"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { idle, type ActionState } from "@/lib/auth/action-state";

export function AcceptInvitationForm({ action }: { action: (prev: ActionState) => Promise<ActionState> }) {
  const [state, formAction, pending] = useActionState(action, idle);
  return (
    <form action={formAction} className="grid gap-4">
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Joining…" : "Accept invitation"}
      </Button>
    </form>
  );
}
