"use client";

import { useActionState } from "react";
import { updatePassword } from "@/app/(marketing)/actions";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { FormMessage } from "@/components/ui/form-message";
import { idle } from "@/lib/auth/action-state";

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, idle);
  return (
    <form action={action} className="grid gap-4">
      <FormField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        errors={state.fieldErrors?.password}
      />
      <FormField
        label="Confirm new password"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        errors={state.fieldErrors?.confirm}
      />
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Set password"}
      </Button>
    </form>
  );
}
