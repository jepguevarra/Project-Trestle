/** What every Server Action returns to its form. Safe to import from Client Components. */
export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /**
   * What was submitted, returned on failure so the form can re-fill itself: React 19 resets a form
   * after its action runs, which would otherwise wipe the user's input on every error.
   */
  values?: Record<string, string>;
  /**
   * Set by a handler to navigate after a successful write. The wrappers redirect only once the
   * transaction has committed: Next's redirect() throws, and throwing inside `withRls` would roll
   * the write back.
   */
  redirectTo?: string;
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

/** Never echoed back to the browser. */
const SECRET_FIELD = /password|confirm|token/i;

/** The submitted text fields, minus secrets and React's internal `$ACTION_` fields. */
export function echoValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData) {
    if (typeof value === "string" && !key.startsWith("$") && !SECRET_FIELD.test(key)) values[key] = value;
  }
  return values;
}
