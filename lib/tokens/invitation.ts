import { createHash, randomBytes } from "node:crypto";

/** Invitations stay valid for a week. */
export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** A fresh, unguessable invitation token. Only its hash is stored; the token goes in the email. */
export function generateInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Must match `encode(sha256(convert_to(token, 'UTF8')), 'hex')` in public.accept_invitation. */
export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
