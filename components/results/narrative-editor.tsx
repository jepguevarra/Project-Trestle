"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Textarea } from "@/components/ui/textarea";
import { idle, type ActionState } from "@/lib/auth/action-state";

/** One narrative block: the consultant's words, saved against the report and printed in the PDF. */
export function NarrativeEditor({
  action,
  instrumentId,
  narrativeKey,
  label,
  hint,
  initial,
  canEdit,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  instrumentId: string;
  narrativeKey: string;
  label: string;
  hint: string;
  initial: string;
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, idle);
  const id = `narrative-${narrativeKey}`;
  if (!canEdit) {
    return (
      <section aria-labelledby={id} className="grid gap-1">
        <h3 id={id} className="text-sm font-semibold">
          {label}
        </h3>
        <p className="text-sm whitespace-pre-wrap">{initial || <span className="text-muted-foreground">Not written yet.</span>}</p>
      </section>
    );
  }
  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="instrumentId" value={instrumentId} />
      <input type="hidden" name="key" value={narrativeKey} />
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <Textarea id={id} name="body" rows={6} defaultValue={state.ok ? undefined : (state.values?.body ?? initial)} placeholder={hint} />
      {state.fieldErrors?.body ? <p className="text-sm text-destructive">{state.fieldErrors.body[0]}</p> : null}
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : `Save ${label.toLowerCase()}`}
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
