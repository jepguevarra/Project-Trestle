"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "@/app/(marketing)/actions";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { FormMessage } from "@/components/ui/form-message";
import { idle } from "@/lib/auth/action-state";

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, idle);
  return (
    <form action={action} className="grid gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <FormField label="Email" name="email" type="email" autoComplete="email" required errors={state.fieldErrors?.email} />
      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        errors={state.fieldErrors?.password}
      />
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <div className="flex justify-between text-sm">
        <Link href="/reset-password" className="text-primary underline-offset-4 hover:underline">
          Forgot password?
        </Link>
        <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
          Create an account
        </Link>
      </div>
    </form>
  );
}
