import "server-only";
import type { z } from "zod";
import type { Tx } from "@/lib/db";
import { withRls } from "@/lib/db";
import { pgErrorMessage } from "@/lib/db/errors";
import { echoValues, fieldErrorsFrom, type ActionState } from "./action-state";
import { resolveOrgFromSlug, type OrgContext } from "./membership";
import { hasRole, type Role } from "./roles";
import { claimsFor, getCurrentUser } from "./session";

type Handler<S extends z.ZodType> = (
  ctx: OrgContext & { tx: Tx },
  input: z.infer<S>,
) => Promise<ActionState | void>;

/**
 * The one wrapper every org-scoped Server Action goes through, in the order CLAUDE.md sets:
 * validate input with Zod → check org membership and role → run the handler (which writes through
 * lib/db/mutations and calls `revalidatePath`).
 *
 * - The org comes from the URL slug the action is bound to, never from the form body.
 * - The role check protects verbs; RLS protects rows.
 * - The handler runs inside `withRls`, so Postgres enforces tenancy even if a check here is wrong.
 * - Phase 12's `assertEntitlement` belongs in this wrapper, alongside the role check.
 *
 * Usage: `const action = orgAction("admin", schema, handler)`, then in a Server Component
 * `action.bind(null, orgSlug)` and hand that to `useActionState`.
 */
export function orgAction<S extends z.ZodType>(minRole: Role, schema: S, handler: Handler<S>) {
  return async (orgSlug: string, prev: ActionState, formData: FormData): Promise<ActionState> => {
    const result = await run(orgSlug, prev, formData);
    return result.ok ? result : { ...result, values: echoValues(formData) };
  };

  async function run(orgSlug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
    const parsed = schema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, message: "Check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
    }

    const user = await getCurrentUser();
    if (!user) return { ok: false, message: "Your session has ended. Sign in again." };

    const ctx = await resolveOrgFromSlug(orgSlug, user);
    if (!ctx) return { ok: false, message: "Not found." };
    if (!hasRole(ctx.role, minRole)) return { ok: false, message: "You don't have permission to do that." };

    try {
      const result = await withRls(claimsFor(user), (tx) => handler({ user, ...ctx, tx }, parsed.data));
      return result ?? { ok: true };
    } catch (err) {
      const message = pgErrorMessage(err);
      if (message) return { ok: false, message };
      throw err;
    }
  }
}
