import type { Metadata } from "next";
import { AssignForm } from "@/components/engagements/assign-form";
import { ActionButton } from "@/components/ui/action-button";
import { FormView } from "@/components/views/form-view";
import { InlineList } from "@/components/views/inline-list";
import { requireEngagementAccess } from "@/lib/auth/engagement";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { claimsFor } from "@/lib/auth/session";
import { withRls } from "@/lib/db";
import { listEngagementTeam } from "@/lib/db/queries/engagements";
import { listOrgMembers } from "@/lib/db/queries/members";
import { assignMember, unassignMember } from "../actions";

export const metadata: Metadata = { title: "Engagement settings" };

/** Who can open this engagement. Admins manage it; everyone on the team can see it. */
export default async function EngagementSettings({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const { orgSlug, id } = await params;
  const { org, engagement, user, isAdmin } = await requireEngagementAccess(orgSlug, id);
  const { team, members } = await withRls(claimsFor(user), async (tx) => ({
    team: await listEngagementTeam(tx, org.id, engagement.id),
    members: isAdmin ? await listOrgMembers(tx, org.id) : [],
  }));
  const onTeam = new Set(team.map((m) => m.userId));
  const candidates = members.flatMap((m) =>
    !onTeam.has(m.userId) && (m.role === "consultant" || m.role === "viewer") ? [{ userId: m.userId, email: m.email, role: m.role }] : [],
  );
  const bind = <A extends unknown[], R>(fn: (orgSlug: string, id: string, ...rest: A) => R) => fn.bind(null, org.slug, engagement.id);
  const base = `/${org.slug}/engagements/${engagement.id}`;

  return (
    <FormView breadcrumbs={[{ label: engagement.name, href: `${base}/overview` }, { label: "Settings" }]}>
      <section aria-labelledby="team-heading" className="grid gap-3">
        <div>
          <h2 id="team-heading" className="text-sm font-semibold">
            Team
          </h2>
          <p className="text-sm text-muted-foreground">
            Who can open this engagement. Owners and admins always can, so they are not listed. Invite new people from Members
            first, then add them here.
          </p>
        </div>
        <InlineList
          columns={[
            { key: "email", label: "Member" },
            { key: "role", label: "Role" },
            { key: "access", label: "Access" },
          ]}
          rows={team.map((m) => ({
            id: m.userId,
            cells: { email: m.email, role: ROLE_LABELS[m.role], access: m.role === "viewer" || m.access === "read" ? "Read only" : "Can edit" },
          }))}
          rowAction={
            isAdmin
              ? (userId) => (
                  <ActionButton
                    action={bind(unassignMember)}
                    fields={{ userId }}
                    label="Remove"
                    variant="ghost"
                    confirmText={`Remove ${team.find((m) => m.userId === userId)?.email} from this engagement?`}
                  />
                )
              : undefined
          }
          emptyText="Nobody is assigned yet."
          add={isAdmin && candidates.length ? <AssignForm action={bind(assignMember)} candidates={candidates} /> : null}
        />
      </section>
    </FormView>
  );
}
