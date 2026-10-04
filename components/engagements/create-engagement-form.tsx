"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { FormMessage } from "@/components/ui/form-message";
import { SelectField } from "@/components/ui/select-field";
import { idle, type ActionState } from "@/lib/auth/action-state";
import { ENGAGEMENT_TYPE_HINTS, ENGAGEMENT_TYPE_LABELS, ENGAGEMENT_TYPES } from "@/lib/validation/engagements";

export function CreateEngagementForm({
  action,
  clients,
  defaultClientId,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  clients: { id: string; name: string }[];
  defaultClientId?: string;
}) {
  const [state, formAction, pending] = useActionState(action, idle);
  const v = state.values;
  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <SelectField
        label="Client"
        name="clientId"
        required
        placeholder="Choose a client"
        options={clients.map((c) => ({ value: c.id, label: c.name }))}
        defaultValue={v?.clientId ?? defaultClientId ?? ""}
        errors={state.fieldErrors?.clientId}
      />
      <FormField label="Engagement name" name="name" required defaultValue={v?.name} errors={state.fieldErrors?.name} />
      <SelectField
        label="Type of change"
        name="type"
        required
        placeholder="Choose a type"
        options={ENGAGEMENT_TYPES.map((t) => ({ value: t, label: `${ENGAGEMENT_TYPE_LABELS[t]}: ${ENGAGEMENT_TYPE_HINTS[t]}` }))}
        defaultValue={v?.type ?? ""}
        errors={state.fieldErrors?.type}
      />
      <FormField
        label="Target system"
        name="targetSystem"
        required
        placeholder="e.g. Odoo 18, NetSuite, custom web app"
        defaultValue={v?.targetSystem}
        errors={state.fieldErrors?.targetSystem}
      />
      <FormField
        label="Target go-live (optional)"
        name="targetGoLive"
        type="date"
        defaultValue={v?.targetGoLive}
        errors={state.fieldErrors?.targetGoLive}
      />
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create engagement"}
        </Button>
        <FormMessage state={state} />
        <p className="text-sm text-muted-foreground">The type can only be changed by an admin later.</p>
      </div>
    </form>
  );
}
