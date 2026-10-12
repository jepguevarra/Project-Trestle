"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { orgAction } from "@/lib/auth/action";
import { removeLogo, saveLogo } from "@/lib/db/mutations/report";
import { imageType, logoSchema } from "@/lib/validation/report";

export const uploadLogo = orgAction("admin", logoSchema, async ({ tx, org }, input) => {
  const bytes = Buffer.from(await input.logo.arrayBuffer());
  const type = imageType(bytes);
  if (!type) return { ok: false, fieldErrors: { logo: ["That file is not a PNG or JPEG image."] } };
  await saveLogo(tx, org.id, bytes, type);
  revalidatePath(`/${org.slug}/settings/branding`);
  return { ok: true, message: "Logo saved. It appears on exported reports." };
});

export const deleteLogo = orgAction("admin", z.object({}), async ({ tx, org }) => {
  await removeLogo(tx, org.id);
  revalidatePath(`/${org.slug}/settings/branding`);
  return { ok: true, message: "Logo removed." };
});
