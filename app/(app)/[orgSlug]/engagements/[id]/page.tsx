import type { Metadata } from "next";
import { AssignForm } from "@/components/engagements/assign-form";
import { EngagementDetailsForm } from "@/components/engagements/engagement-details-form";
import { ActionButton } from "@/components/ui/action-button";
import { Table, Td, Th } from "@/components/ui/table";
import { requireEngagementAccess } from "@/lib/auth/engagement";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { claimsFor } from "@/lib/auth/session";
import { withRls } from "@/lib/db";
import { listEngagementTeam } from "@/lib/db/queries/engagements";
import { listOrgMembers } from "@/lib/db/queries/members";
import { ENGAGEMENT_TYPE_LABELS } from "@/lib/validation/engagements";
import {
  archiveEngagement,
  assignMember,
  reactivateEngagement,
  unassignMember,
  updateEngagementDetails,
} from "./actions";

export const metadata: Metadata = { title: "Engagement" };

export default async function EngagementOverview({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const { orgSlug, id } = await params;
  const ctx = await requireEngagementAccess(orgSlug, id);
  const { org, engagement, user, canEdit, isAdmin, access } = ctx;

  const { team, members } = await withRls(claimsFor(user), async (tx) => ({
    team: await listEngagementTeam(tx, org.id, engagement.id),
    members: isAdmin ? await listOrgMembers(tx, org.id) : [],
  }));
  const onTeam = new Set(team.map((m) => m.userId));
  const candidates = members.flatMap((m) =>
    !onTeam.has(m.userId) && (m.role === "consultant" || m.role === "viewer")
      ? [{ userId: m.userId, email: m.email, role: m.role }]
      : [],
  );
  const bind = <A extends unknown[], R>(fn: (orgSlug: string, id: string, ...rest: A) => R) =>
    fn.bind(null, org.slug, engagement.id);

  return (
    <div className="grid gap-8">
      <section aria-labelledby="details-heading" className="grid gap-3">
        <h2 id="details-heading" className="text-sm font-semibold">
          Details
        </h2>
        {canEdit ? (
          <EngagementDetailsForm action={bind(updateEngagementDetails)} engagement={engagement} />
        ) : (
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
            <dt className="text-muted-foreground">Type</dt>
            <dd>{ENGAGEMENT_TYPE_LABELS[engagement.type]}</dd>
            <dt className="text-muted-foreground">Target system</dt>
            <dd>{engagement.targetSystem}</dd>
            <dt className="text-muted-foreground">Target go-live</dt>
            <dd className="tabular-nums">{engagement.targetGoLive ?? "Not set"}</dd>
            <dt className="text-muted-foreground">Your access</dt>
            <dd>{engagement.status === "archived" || access === "read" ? "Read only" : "Can edit"}</dd>
          </dl>
        )}
      </section>

      <section aria-labelledby="team-heading" className="grid gap-3">
        <div>
          <h2 id="team-heading" className="text-sm font-semibold">
            Team
          </h2>
          <p className="text-sm text-muted-foreground">Owners and admins can open every engagement and are not listed.</p>
        </div>
        {team.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Member</Th>
                <Th>Role</Th>
                <Th>Access</Th>
                {isAdmin ? <Th className="w-0">
                  <span className="sr-only">Actions</span>
                </Th> : null}
              </tr>
            </thead>
            <tbody>
              {team.map((m) => (
                <tr key={m.userId}>
                  <Td>{m.email}</Td>
                  <Td>{ROLE_LABELS[m.role]}</Td>
                  <Td>{m.role === "viewer" || m.access === "read" ? "Read only" : "Can edit"}</Td>
                  {isAdmin ? (
                    <Td>
                      <ActionButton
                        action={bind(unassignMember)}
                        fields={{ userId: m.userId }}
                        label="Remove"
                        variant="ghost"
                        confirmText={`Remove ${m.email} from this engagement?`}
                      />
                    </Td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">Nobody is assigned yet.</p>
        )}
        {isAdmin && candidates.length ? <AssignForm action={bind(assignMember)} candidates={candidates} /> : null}
      </section>

      {isAdmin ? (
        <section aria-labelledby="status-heading" className="grid gap-2">
          <h2 id="status-heading" className="text-sm font-semibold">
            Status
          </h2>
          {engagement.status === "active" ? (
            <>
              <p className="text-sm text-muted-foreground">
                Archiving makes the engagement read-only and removes it from the active list. It stays readable,
                and it can be re-activated.
              </p>
              <ActionButton
                action={bind(archiveEngagement)}
                label="Archive engagement"
                pendingLabel="Archiving…"
                confirmText="Archive this engagement? It becomes read-only until re-activated."
              />
            </>
          ) : (
            <ActionButton action={bind(reactivateEngagement)} label="Re-activate engagement" pendingLabel="Re-activating…" />
          )}
        </section>
      ) : null}
    </div>
  );
}
