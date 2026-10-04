"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { FormMessage } from "@/components/ui/form-message";
import { idle, type ActionState } from "@/lib/auth/action-state";

export function EngagementDetailsForm({
  action,
  engagement,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  engagement: { name: string; targetSystem: string; targetGoLive: string | null };
}) {
  const [state, formAction, pending] = useActionState(action, idle);
  const v = state.values;
  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-3">
      <FormField label="Name" name="name" required defaultValue={v?.name ?? engagement.name} errors={state.fieldErrors?.name} />
      <FormField
        label="Target system"
        name="targetSystem"
        required
        defaultValue={v?.targetSystem ?? engagement.targetSystem}
        errors={state.fieldErrors?.targetSystem}
      />
      <FormField
        label="Target go-live"
        name="targetGoLive"
        type="date"
        defaultValue={v?.targetGoLive ?? engagement.targetGoLive ?? ""}
        errors={state.fieldErrors?.targetGoLive}
      />
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save details"}
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
