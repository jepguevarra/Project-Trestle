import { z } from "zod";
import { ROLES } from "@/lib/auth/roles";

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."));
const password = z.string().min(8, "Use at least 8 characters.").max(72, "Use at most 72 characters.");

export const orgNameSchema = z
  .string()
  .trim()
  .min(2, "Enter your firm's name.")
  .max(80, "Keep it under 80 characters.");

export const signUpSchema = z
  .object({
    email,
    password,
    // Absent when signing up to accept an invitation: that user joins an existing org instead.
    orgName: z.string().trim().optional(),
    invite: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.invite) return;
    const r = orgNameSchema.safeParse(v.orgName ?? "");
    if (!r.success) ctx.addIssue({ code: "custom", path: ["orgName"], message: r.error.issues[0]!.message });
  });

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

export const resetRequestSchema = z.object({ email });

export const updatePasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match." });

export const createOrgSchema = z.object({ name: orgNameSchema });

export const roleSchema = z.enum(ROLES);

export const inviteMemberSchema = z.object({ email, role: roleSchema });
export const changeRoleSchema = z.object({ membershipId: z.uuid(), role: roleSchema });
export const removeMemberSchema = z.object({ membershipId: z.uuid() });
export const revokeInvitationSchema = z.object({ invitationId: z.uuid() });

/**
 * Only same-origin relative paths survive as a post-login redirect target. Blocks open redirects
 * such as `//evil.example` and `/\evil.example`.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
