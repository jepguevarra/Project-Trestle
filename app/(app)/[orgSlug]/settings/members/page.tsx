import type { Metadata } from "next";
import { InviteForm } from "@/components/members/invite-form";
import { MemberRowActions } from "@/components/members/member-row-actions";
import { RevokeInvitationButton } from "@/components/members/revoke-invitation-button";
import { requireMembership } from "@/lib/auth/membership";
import { assignableRoles, hasRole, ROLE_LABELS } from "@/lib/auth/roles";
import { claimsFor } from "@/lib/auth/session";
import { withRls } from "@/lib/db";
import { listOrgMembers, listPendingInvitations } from "@/lib/db/queries/members";
import { changeRole, inviteMember, removeMember, revokeInvitation } from "./actions";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { user, org, role } = await requireMembership(orgSlug);
  const canManage = hasRole(role, "admin");
  const roles = assignableRoles(role);

  const { members, pending } = await withRls(claimsFor(user), async (tx) => ({
    members: await listOrgMembers(tx, org.id),
    // RLS returns no invitations to non-admins; the query is skipped for them anyway.
    pending: canManage ? await listPendingInvitations(tx, org.id) : [],
  }));

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-xl font-semibold">Members</h1>
        <p className="mt-1 text-sm text-muted-foreground">People in {org.name} and what they can do.</p>
      </div>

      {canManage ? (
        <section aria-labelledby="invite-heading" className="rounded-md border border-border bg-card p-4">
          <h2 id="invite-heading" className="mb-3 text-sm font-semibold">
            Invite someone
          </h2>
          <InviteForm action={inviteMember.bind(null, org.slug)} roles={roles} />
        </section>
      ) : null}

      <section aria-labelledby="members-heading">
        <h2 id="members-heading" className="mb-2 text-sm font-semibold">
          {members.length} {members.length === 1 ? "member" : "members"}
        </h2>
        <ul className="divide-y divide-border rounded-md border border-border bg-card">
          {members.map((m) => {
            const manageable = m.userId !== user.id && roles.includes(m.role);
            return (
              <li key={m.membershipId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm">
                    {m.email}
                    {m.userId === user.id ? <span className="text-muted-foreground"> (you)</span> : null}
                  </p>
                  <p className="text-sm text-muted-foreground">{ROLE_LABELS[m.role]}</p>
                </div>
                {manageable ? (
                  <MemberRowActions
                    membershipId={m.membershipId}
                    email={m.email}
                    role={m.role}
                    roles={roles}
                    changeRole={changeRole.bind(null, org.slug)}
                    removeMember={removeMember.bind(null, org.slug)}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      {canManage && pending.length > 0 ? (
        <section aria-labelledby="pending-heading">
          <h2 id="pending-heading" className="mb-2 text-sm font-semibold">
            Pending invitations
          </h2>
          <ul className="divide-y divide-border rounded-md border border-border bg-card">
            {pending.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm">{i.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {ROLE_LABELS[i.role]} · expires {i.expiresAt.toISOString().slice(0, 10)}
                  </p>
                </div>
                <RevokeInvitationButton invitationId={i.id} action={revokeInvitation.bind(null, org.slug)} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
