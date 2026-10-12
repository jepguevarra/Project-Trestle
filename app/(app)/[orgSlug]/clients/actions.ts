"use server";

import { revalidatePath } from "next/cache";
import { orgAction } from "@/lib/auth/action";
import { createClient as insertClient, updateClientTracked } from "@/lib/db/mutations/clients";
import { logNote } from "@/lib/db/mutations/messages";
import { findClient } from "@/lib/db/queries/clients";
import { clientNoteSchema, clientSchema, updateClientSchema } from "@/lib/validation/engagements";

export const createClient = orgAction("admin", clientSchema, async ({ tx, org }, input) => {
  const { id } = await insertClient(tx, org.id, input);
  revalidatePath(`/${org.slug}/clients`);
  return { ok: true, redirectTo: `/${org.slug}/clients/${id}` };
});

export const saveClient = orgAction("admin", updateClientSchema, async ({ tx, org, user }, { clientId, ...fields }) => {
  if (!(await updateClientTracked(tx, org.id, clientId, fields, user.id))) {
    return { ok: false, message: "That client no longer exists." };
  }
  revalidatePath(`/${org.slug}/clients`);
  revalidatePath(`/${org.slug}/clients/${clientId}`);
  return { ok: true, message: "Saved." };
});

export const logClientNote = orgAction("admin", clientNoteSchema, async ({ tx, org, user }, input) => {
  if (!(await findClient(tx, org.id, input.clientId))) return { ok: false, message: "That client no longer exists." };
  await logNote(tx, { orgId: org.id, engagementId: null, resType: "client", resId: input.clientId, authorUserId: user.id }, input.body);
  revalidatePath(`/${org.slug}/clients/${input.clientId}`);
  return { ok: true };
});
