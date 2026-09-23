"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Select } from "@/components/ui/select";
import { idle, type ActionState } from "@/lib/auth/action-state";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function MemberRowActions({
  membershipId,
  email,
  role,
  roles,
  changeRole,
  removeMember,
}: {
  membershipId: string;
  email: string;
  role: Role;
  roles: Role[];
  changeRole: Action;
  removeMember: Action;
}) {
  const [changeState, changeAction, changing] = useActionState(changeRole, idle);
  const [removeState, removeAction, removing] = useActionState(removeMember, idle);

  return (
    <div className="grid gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <form action={changeAction} className="flex items-center gap-2">
          <input type="hidden" name="membershipId" value={membershipId} />
          <Select name="role" defaultValue={role} aria-label={`Role for ${email}`} disabled={changing}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="outline" size="sm" disabled={changing}>
            Save
          </Button>
        </form>
        <form
          action={removeAction}
          onSubmit={(e) => {
            if (!confirm(`Remove ${email} from this organisation?`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="membershipId" value={membershipId} />
          <Button type="submit" variant="ghost" size="sm" className="text-destructive" disabled={removing}>
            Remove
          </Button>
        </form>
      </div>
      {changeState.message && !changeState.ok ? <FormMessage state={changeState} /> : null}
      {removeState.message && !removeState.ok ? <FormMessage state={removeState} /> : null}
    </div>
  );
}
