"use server";

import { redirect } from "next/navigation";
import { echoValues, fieldErrorsFrom, type ActionState } from "@/lib/auth/action-state";
import { claimsFor, getCurrentUser } from "@/lib/auth/session";
import { withRls } from "@/lib/db";
import { pgErrorMessage } from "@/lib/db/errors";
import * as orgMutations from "@/lib/db/mutations/organizations";
import { createOrgSchema } from "@/lib/validation/auth";

// Actions for a signed-in user that are not scoped to an org they already belong to.

export async function createOrganization(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = createOrgSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues), values: echoValues(formData) };
  }

  const slug = await withRls(claimsFor(user), (tx) => orgMutations.createOrganization(tx, parsed.data.name));
  redirect(`/${slug}`);
}

export async function acceptInvitation(token: string, _prev: ActionState): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);

  let slug: string;
  try {
    slug = await withRls(claimsFor(user), (tx) => orgMutations.acceptInvitation(tx, token));
  } catch (err) {
    const message = pgErrorMessage(err);
    if (message) return { ok: false, message };
    throw err;
  }
  redirect(`/${slug}`);
}
