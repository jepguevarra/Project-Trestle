"use client";

import { useActionState } from "react";
import { createOrganization } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { idle } from "@/lib/auth/action-state";

export function CreateOrgForm() {
  const [state, action, pending] = useActionState(createOrganization, idle);
  return (
    <form action={action} className="grid gap-4">
      <FormField label="Firm name" name="name" autoComplete="organization" required errors={state.fieldErrors?.name} />
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create workspace"}
      </Button>
    </form>
  );
}
