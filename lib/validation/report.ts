import { z } from "zod";
import { NARRATIVE_KEYS } from "@/lib/db/schema/report";

export const narrativeSchema = z.object({
  instrumentId: z.uuid(),
  key: z.enum(NARRATIVE_KEYS),
  body: z.string().max(20000, "Keep it under 20,000 characters."),
});

export const addThemeSchema = z.object({
  instrumentId: z.uuid(),
  responseId: z.uuid(),
  theme: z.string().trim().min(1, "Name the theme.").max(60, "Keep themes short: 60 characters at most."),
});

export const removeThemeSchema = z.object({ instrumentId: z.uuid(), themeId: z.uuid() });

export const MAX_LOGO_BYTES = 512 * 1024;

/** PNG or JPEG, checked by content as well as by the declared type. */
export const logoSchema = z.object({
  logo: z
    .instanceof(File, { message: "Choose an image file." })
    .refine((f) => f.size > 0, "Choose an image file.")
    .refine((f) => f.size <= MAX_LOGO_BYTES, "Keep the logo under 512 KB.")
    .refine((f) => f.type === "image/png" || f.type === "image/jpeg", "Use a PNG or JPEG image."),
});

export function imageType(bytes: Buffer): "image/png" | "image/jpeg" | null {
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  return null;
}
