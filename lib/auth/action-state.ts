/** What every Server Action returns to its form. Safe to import from Client Components. */
export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const idle: ActionState = { ok: false };

/** Zod issues → per-field messages, keyed by the top-level field name. */
export function fieldErrorsFrom(issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}
