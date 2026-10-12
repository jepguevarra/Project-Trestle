"use client";

import { useActionState } from "react";
import { idle, type ActionState } from "@/lib/auth/action-state";
import { Button } from "./button";
import { FormMessage } from "./form-message";

/** A one-button form: hidden fields, an optional confirm, and the action's message. */
export function ActionButton({
  action,
  fields = {},
  label,
  pendingLabel,
  confirmText,
  variant = "outline",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  fields?: Record<string, string>;
  label: string;
  pendingLabel?: string;
  confirmText?: string;
  variant?: "default" | "outline" | "ghost";
}) {
  const [state, formAction, pending] = useActionState(action, idle);
  return (
    <form
      action={formAction}
      className="flex flex-wrap items-center gap-3"
      onSubmit={(e) => {
        if (confirmText && !confirm(confirmText)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button type="submit" variant={variant} size="sm" disabled={pending}>
        {pending ? (pendingLabel ?? label) : label}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
