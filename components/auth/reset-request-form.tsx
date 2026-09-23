"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/app/(marketing)/actions";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { FormMessage } from "@/components/ui/form-message";
import { idle } from "@/lib/auth/action-state";

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, idle);
  return (
    <form action={action} className="grid gap-4">
      <FormField label="Email" name="email" type="email" autoComplete="email" required errors={state.fieldErrors?.email} />
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
