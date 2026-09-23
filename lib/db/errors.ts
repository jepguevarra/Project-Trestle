/** Postgres SQLSTATE of an error, unwrapping Drizzle's query error wrapper. */
export function pgCode(err: unknown): string | undefined {
  let e: unknown = err;
  while (e && typeof e === "object") {
    if ("code" in e && typeof e.code === "string") return e.code;
    e = "cause" in e ? e.cause : undefined;
  }
  return undefined;
}

/**
 * Handlers should not rely on catching these inside `withRls`: a failed statement aborts the
 * transaction, so the error surfaces at commit. Pre-check instead, and let this map the race.
 *
 * User-facing text for the errors our migrations raise on purpose (the TR* codes) and for RLS
 * denials. Anything else returns undefined and is rethrown, so real bugs are not disguised.
 */
export function pgErrorMessage(err: unknown): string | undefined {
  switch (pgCode(err)) {
    case "23505":
      // A unique constraint lost a race with a concurrent request; the pre-checks cover the rest.
      return "That already exists. Refresh the page and try again.";
    case "42501":
      return "You don't have permission to do that.";
    case "TR400":
      return "That change isn't allowed.";
    case "TR401":
      return "Your session has ended. Sign in again.";
    case "TR403":
      return "This invitation was sent to a different email address. Sign in with that address to accept it.";
    case "TR404":
      return "This invitation is invalid, has already been used, or has expired.";
    case "TR409":
      return "An organisation must keep at least one owner.";
    default:
      return undefined;
  }
}
