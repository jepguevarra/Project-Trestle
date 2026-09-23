"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { FormMessage } from "@/components/ui/form-message";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { idle, type ActionState } from "@/lib/auth/action-state";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";

export function InviteForm({
  action,
  roles,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  roles: Role[];
}) {
  const [state, formAction, pending] = useActionState(action, idle);
  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
      <FormField label="Email" name="email" type="email" required errors={state.fieldErrors?.email} />
      <div className="grid gap-1.5">
        <Label htmlFor="invite-role">Role</Label>
        <Select id="invite-role" name="role" defaultValue="consultant">
          {roles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send invitation"}
      </Button>
      <div className="sm:col-span-3">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
