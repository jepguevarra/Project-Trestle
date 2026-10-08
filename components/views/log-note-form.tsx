"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Textarea } from "@/components/ui/textarea";
import { idle, type ActionState } from "@/lib/auth/action-state";

export function LogNoteForm({
  action,
  hidden = {},
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  hidden?: Record<string, string>;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await action(prev, fd);
    if (result.ok) ref.current?.reset();
    return result;
  }, idle);
  return (
    <form ref={ref} action={formAction} className="grid gap-2">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <label htmlFor="chatter-note" className="text-sm font-semibold">
        Log note
      </label>
      <Textarea id="chatter-note" name="body" required defaultValue={state.ok ? "" : state.values?.body} placeholder="Visible to everyone who can open this record." />
      {state.fieldErrors?.body ? <p className="text-sm text-destructive">{state.fieldErrors.body[0]}</p> : null}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Logging…" : "Log"}
        </Button>
        {!state.ok ? <FormMessage state={state} /> : null}
      </div>
    </form>
  );
}
