import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed survey links (DATA-MODEL.md §12, the anonymous respondent path). Pure functions: the key
 * is passed in, so they are unit-testable and carry no env or database dependency.
 *
 * Format: base64url(JSON claims) "." base64url(HMAC-SHA256(claims)). The claims are not secret
 * (ids and versions); the signature is what makes them trustworthy.
 */
export type SurveyClaims = {
  /** respondent_id */
  r: string;
  /** instrument_id */
  i: string;
  /** respondent.token_version: bumped to revoke one person's link */
  v: number;
  /** instrument.token_epoch: bumped to revoke every link for the instrument */
  e: number;
  /** expiry, seconds since the epoch */
  exp: number;
};

export type VerifyResult = { ok: true; claims: SurveyClaims } | { ok: false; reason: "malformed" | "signature" | "expired" };

const sign = (payload: string, key: string) => createHmac("sha256", key).update(payload).digest("base64url");

export function mintSurveyToken(claims: SurveyClaims, key: string): string {
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isClaims = (c: unknown): c is SurveyClaims => {
  if (!c || typeof c !== "object") return false;
  const o = c as Record<string, unknown>;
  return (
    typeof o.r === "string" && uuid.test(o.r) &&
    typeof o.i === "string" && uuid.test(o.i) &&
    Number.isInteger(o.v) && Number.isInteger(o.e) && Number.isInteger(o.exp)
  );
};

/** Checks shape, signature (in constant time) and expiry. Versions are checked against the database by the caller. */
export function verifySurveyToken(token: string, key: string, now: Date = new Date()): VerifyResult {
  if (token.length > 1000) return { ok: false, reason: "malformed" };
  const [payload, signature, ...rest] = token.split(".");
  if (!payload || !signature || rest.length) return { ok: false, reason: "malformed" };

  const expected = Buffer.from(sign(payload, key));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: "signature" };

  let claims: unknown;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (!isClaims(claims)) return { ok: false, reason: "malformed" };
  if (claims.exp * 1000 < now.getTime()) return { ok: false, reason: "expired" };
  return { ok: true, claims };
}

/** Why a correctly signed link is still refused, given what the database says now. */
export function staleReason(
  claims: SurveyClaims,
  current: { instrumentId: string; tokenVersion: number; tokenEpoch: number },
): "wrong_instrument" | "revoked" | null {
  if (claims.i !== current.instrumentId) return "wrong_instrument";
  if (claims.v !== current.tokenVersion || claims.e !== current.tokenEpoch) return "revoked";
  return null;
}

/** Links last until the instrument closes, or 90 days from sending when it has no close date. */
export function surveyTokenExpiry(closesAt: Date | null, now: Date = new Date()): number {
  const fallback = now.getTime() + 90 * 24 * 60 * 60 * 1000;
  return Math.floor((closesAt ? Math.max(closesAt.getTime(), now.getTime()) : fallback) / 1000);
}
