"use server";

import { redirect } from "next/navigation";
import { fieldErrorsFrom, type ActionState } from "@/lib/auth/action-state";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  resetRequestSchema,
  safeNextPath,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@/lib/validation/auth";

const invalid = (issues: Parameters<typeof fieldErrorsFrom>[0]): ActionState => ({
  ok: false,
  message: "Check the highlighted fields.",
  fieldErrors: fieldErrorsFrom(issues),
});

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error.issues);
  const { email, password, orgName, invite } = parsed.data;

  const next = invite ? `/invite/${encodeURIComponent(invite)}` : "/";
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Read by the on_auth_user_created trigger, which creates the org and owner membership in the
      // same transaction as the user. Invitees pass none and join the inviting org instead.
      data: invite ? {} : { org_name: orgName },
      emailRedirectTo: `${env.APP_URL}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { ok: false, message: error.message };

  // With email confirmation off (the local default) the user is signed in straight away.
  if (data.session) redirect(next as never);
  return { ok: true, message: "Check your email for a link to confirm your address." };
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error.issues);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { ok: false, message: "Email or password is incorrect." };
  redirect(safeNextPath(parsed.data.next) as never);
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error.issues);

  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.APP_URL}/auth/callback?next=${encodeURIComponent("/update-password")}`,
  });
  // Same answer whether or not the address has an account.
  return { ok: true, message: "If that address has an account, a reset link is on its way." };
}

export async function updatePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = updatePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error.issues);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, message: error.message };
  redirect("/");
}
