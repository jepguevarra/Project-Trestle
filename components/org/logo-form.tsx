"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { idle, type ActionState } from "@/lib/auth/action-state";

export function LogoForm({ action }: { action: (prev: ActionState, formData: FormData) => Promise<ActionState> }) {
  const [state, formAction, pending] = useActionState(action, idle);
  const errors = state.fieldErrors?.logo;
  return (
    <form action={formAction} className="grid gap-2">
      <label htmlFor="logo" className="text-sm text-muted-foreground">
        Logo (PNG or JPEG, under 512 KB)
      </label>
      <input id="logo" name="logo" type="file" accept="image/png,image/jpeg" required aria-invalid={errors?.length ? true : undefined} className="text-sm" />
      {errors?.length ? <p className="text-sm text-destructive">{errors[0]}</p> : null}
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Uploading…" : "Upload"}
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
