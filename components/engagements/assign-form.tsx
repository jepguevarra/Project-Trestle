"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { SelectField } from "@/components/ui/select-field";
import { idle, type ActionState } from "@/lib/auth/action-state";

export function AssignForm({
  action,
  candidates,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  candidates: { userId: string; email: string; role: "consultant" | "viewer" }[];
}) {
  const [state, formAction, pending] = useActionState(action, idle);
  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
      <SelectField
        label="Member"
        name="userId"
        required
        placeholder="Choose a consultant or viewer"
        options={candidates.map((c) => ({ value: c.userId, label: `${c.email} (${c.role === "viewer" ? "Viewer" : "Consultant"})` }))}
        defaultValue={state.values?.userId ?? ""}
        errors={state.fieldErrors?.userId}
      />
      <SelectField
        label="Access"
        name="access"
        options={[
          { value: "edit", label: "Can edit" },
          { value: "read", label: "Read only" },
        ]}
        defaultValue={state.values?.access ?? "edit"}
        errors={state.fieldErrors?.access}
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add to engagement"}
      </Button>
      <div className="sm:col-span-3">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
