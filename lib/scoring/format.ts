import type { Value } from "./types";

// How scores are written everywhere (screen and PDF), so a number reads the same in both.

export const score = (n: number) => n.toFixed(1);
export const alpha = (n: number) => n.toFixed(2);
export const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}`;
export const percent = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "—");

/** A value, or its reason. Never an empty cell. */
export function show(v: Value, format: (n: number) => string = score): { text: string; reason: boolean } {
  return v.value === null ? { text: v.reason, reason: true } : { text: format(v.value), reason: false };
}
