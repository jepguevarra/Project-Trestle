"use server";

import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { fieldErrorsFrom, type ActionState } from "@/lib/auth/action-state";
import { claimsFor, getCurrentUser } from "@/lib/auth/session";
import { withRls } from "@/lib/db";
import { pgErrorMessage } from "@/lib/db/errors";
import { createOrgSchema } from "@/lib/validation/auth";

// Actions for a signed-in user that are not scoped to an org they already belong to.

export async function createOrganization(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = createOrgSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const [row] = await withRls(claimsFor(user), (tx) =>
    tx.execute<{ slug: string }>(sql`select public.create_organization(${parsed.data.name}) as slug`),
  );
  redirect(`/${row!.slug}`);
}

export async function acceptInvitation(token: string, _prev: ActionState): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);

  let slug: string;
  try {
    const [row] = await withRls(claimsFor(user), (tx) =>
      tx.execute<{ slug: string }>(sql`select public.accept_invitation(${token}) as slug`),
    );
    slug = row!.slug;
  } catch (err) {
    const message = pgErrorMessage(err);
    if (message) return { ok: false, message };
    throw err;
  }
  redirect(`/${slug}`);
}
