"use server";

import { revalidatePath } from "next/cache";
import { orgAction } from "@/lib/auth/action";
import { createClient as insertClient, updateClient as saveClient } from "@/lib/db/mutations/clients";
import { clientSchema, updateClientSchema } from "@/lib/validation/engagements";

export const createClient = orgAction("admin", clientSchema, async ({ tx, org }, input) => {
  const { id } = await insertClient(tx, org.id, input);
  revalidatePath(`/${org.slug}/clients`);
  return { ok: true, redirectTo: `/${org.slug}/clients/${id}` };
});

export const updateClient = orgAction("admin", updateClientSchema, async ({ tx, org }, { clientId, ...fields }) => {
  if (!(await saveClient(tx, org.id, clientId, fields))) return { ok: false, message: "That client no longer exists." };
  revalidatePath(`/${org.slug}/clients`);
  revalidatePath(`/${org.slug}/clients/${clientId}`);
  return { ok: true, message: "Client saved." };
});
