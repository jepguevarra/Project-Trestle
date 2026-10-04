"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { FormMessage } from "@/components/ui/form-message";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { idle, type ActionState } from "@/lib/auth/action-state";
import { INDUSTRIES, SIZE_BAND_LABELS, SIZE_BANDS } from "@/lib/validation/engagements";

type Client = { id: string; name: string; industry: string | null; sizeBand: string | null; notes: string | null };

/** Create (no `client`) or edit a client. Industry and size band are plain selects. */
export function ClientForm({
  action,
  client,
  submitLabel,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  client?: Client;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, idle);
  const v = state.values;
  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      {client ? <input type="hidden" name="clientId" value={client.id} /> : null}
      <div className="sm:col-span-2">
        <FormField label="Name" name="name" required defaultValue={v?.name ?? client?.name} errors={state.fieldErrors?.name} />
      </div>
      <SelectField
        label="Industry"
        name="industry"
        placeholder="Not set"
        options={INDUSTRIES.map((i) => ({ value: i, label: i }))}
        defaultValue={v?.industry ?? client?.industry ?? ""}
        errors={state.fieldErrors?.industry}
      />
      <SelectField
        label="Size"
        name="sizeBand"
        placeholder="Not set"
        options={SIZE_BANDS.map((b) => ({ value: b, label: SIZE_BAND_LABELS[b] }))}
        defaultValue={v?.sizeBand ?? client?.sizeBand ?? ""}
        errors={state.fieldErrors?.sizeBand}
      />
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={v?.notes ?? client?.notes ?? ""} />
        {state.fieldErrors?.notes ? <p className="text-sm text-destructive">{state.fieldErrors.notes[0]}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
