"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { idle, type ActionState } from "@/lib/auth/action-state";

export function RevokeInvitationButton({
  invitationId,
  action,
}: {
  invitationId: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [, formAction, pending] = useActionState(action, idle);
  return (
    <form action={formAction}>
      <input type="hidden" name="invitationId" value={invitationId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        Revoke
      </Button>
    </form>
  );
}
