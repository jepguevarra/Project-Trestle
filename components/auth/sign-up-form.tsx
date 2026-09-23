"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "@/app/(marketing)/actions";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { FormMessage } from "@/components/ui/form-message";
import { idle } from "@/lib/auth/action-state";

export function SignUpForm({ invite, email }: { invite?: string; email?: string }) {
  const [state, action, pending] = useActionState(signUp, idle);
  const loginHref = invite ? `/login?next=${encodeURIComponent(`/invite/${invite}`)}` : "/login";

  return (
    <form action={action} className="grid gap-4">
      {invite ? <input type="hidden" name="invite" value={invite} /> : (
        <FormField
          label="Firm name"
          name="orgName"
          autoComplete="organization"
          required
          errors={state.fieldErrors?.orgName}
        />
      )}
      <FormField
        label="Work email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={email}
        required
        errors={state.fieldErrors?.email}
      />
      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        errors={state.fieldErrors?.password}
      />
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={loginHref as never} className="text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
