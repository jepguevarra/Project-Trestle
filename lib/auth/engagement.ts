import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { z } from "zod";
import { withRls, type Tx } from "@/lib/db";
import { pgErrorMessage } from "@/lib/db/errors";
import { findEngagementWithAccess, type Engagement } from "@/lib/db/queries/engagements";
import { echoValues, fieldErrorsFrom, type ActionState } from "./action-state";
import { requireMembership, resolveOrgFromSlug, type OrgContext } from "./membership";
import { hasRole } from "./roles";
import { claimsFor, getCurrentUser } from "./session";

export type EngagementContext = OrgContext & {
  engagement: Engagement;
  clientName: string;
  /** The user's access ignoring status: owners and admins always have edit. */
  access: "edit" | "read";
  /** True when the user may change the engagement's data now: edit access and not archived. */
  canEdit: boolean;
  isAdmin: boolean;
};

const engagementIdSchema = z.uuid();

const loadEngagement = cache(async (orgId: string, engagementId: string, userId: string, email: string | null) =>
  withRls({ sub: userId, email }, (tx) => findEngagementWithAccess(tx, orgId, engagementId)),
);

function toContext(org: OrgContext, row: NonNullable<Awaited<ReturnType<typeof loadEngagement>>>): EngagementContext {
  return {
    ...org,
    engagement: row.engagement,
    clientName: row.clientName,
    access: row.access,
    canEdit: row.access === "edit" && row.engagement.status === "active",
    isAdmin: hasRole(org.role, "admin"),
  };
}

/**
 * Guard for pages under /[orgSlug]/engagements/[id]. Anyone without access gets a 404, including a
 * consultant who is in the org but not assigned: the engagement's existence is not revealed.
 * `level: "edit"` additionally requires edit access to an active engagement.
 */
export async function requireEngagementAccess(
  orgSlug: string,
  engagementId: string,
  level: "read" | "edit" = "read",
): Promise<EngagementContext> {
  const org = await requireMembership(orgSlug);
  if (!engagementIdSchema.safeParse(engagementId).success) notFound();
  const row = await loadEngagement(org.org.id, engagementId, org.user.id, org.user.email ?? null);
  if (!row) notFound();
  const ctx = toContext(org, row);
  if (level === "edit" && !ctx.canEdit) notFound();
  return ctx;
}

type Requirement = "edit" | "admin";
type Handler<S extends z.ZodType> = (ctx: EngagementContext & { tx: Tx }, input: z.infer<S>) => Promise<ActionState | void>;

/**
 * The engagement-scoped twin of `orgAction`: validate → resolve org membership and engagement
 * access → handler inside `withRls`. Bind it to `(orgSlug, engagementId)` from the URL.
 *
 * - "edit": edit access to an active engagement (consultant assigned with edit, or admin).
 * - "admin": owner or admin, whatever the status (archive, re-activate, assign).
 */
export function engagementAction<S extends z.ZodType>(requirement: Requirement, schema: S, handler: Handler<S>) {
  async function run(orgSlug: string, engagementId: string, formData: FormData): Promise<ActionState> {
    const parsed = schema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, message: "Check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
    }

    const user = await getCurrentUser();
    if (!user) return { ok: false, message: "Your session has ended. Sign in again." };
    const org = await resolveOrgFromSlug(orgSlug, user);
    if (!org || !engagementIdSchema.safeParse(engagementId).success) return { ok: false, message: "Not found." };

    try {
      return await withRls(claimsFor(user), async (tx) => {
        const row = await findEngagementWithAccess(tx, org.org.id, engagementId);
        if (!row) return { ok: false, message: "Not found." };
        const ctx = toContext({ user, ...org }, row);
        const allowed = requirement === "admin" ? ctx.isAdmin : ctx.canEdit;
        if (!allowed) {
          return {
            ok: false,
            message: ctx.engagement.status === "archived" && requirement === "edit"
              ? "This engagement is archived. Re-activate it to make changes."
              : "You don't have permission to do that.",
          };
        }
        return (await handler({ ...ctx, tx }, parsed.data)) ?? { ok: true };
      });
    } catch (err) {
      const message = pgErrorMessage(err);
      if (message) return { ok: false, message };
      throw err;
    }
  }

  return async (orgSlug: string, engagementId: string, _prev: ActionState, formData: FormData): Promise<ActionState> => {
    const result = await run(orgSlug, engagementId, formData);
    if (result.ok && result.redirectTo) redirect(result.redirectTo as never);
    return result.ok ? result : { ...result, values: echoValues(formData) };
  };
}
