import type { Metadata } from "next";
import Link from "next/link";
import { Chatter } from "@/components/views/chatter";
import { FormView, type Pager } from "@/components/views/form-view";
import { InlineList } from "@/components/views/inline-list";
import { RecordForm } from "@/components/views/record-form";
import { SmartButtons } from "@/components/views/smart-buttons";
import { Statusbar } from "@/components/views/statusbar";
import { ActionButton } from "@/components/ui/action-button";
import { requireEngagementAccess } from "@/lib/auth/engagement";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { claimsFor } from "@/lib/auth/session";
import { withRls } from "@/lib/db";
import { listClientOptions } from "@/lib/db/queries/clients";
import { engagementIdsInOrder } from "@/lib/db/queries/engagement-collection";
import { listEngagementTeam } from "@/lib/db/queries/engagements";
import { listRecordMessages } from "@/lib/db/queries/messages";
import { ENGAGEMENT_TYPE_LABELS, ENGAGEMENT_TYPES } from "@/lib/validation/engagements";
import { engagementModel } from "@/lib/views/engagement";
import { listContext, parseViewParams, type RawSearchParams } from "@/lib/views/params";
import { archiveEngagement, logEngagementNote, reactivateEngagement, saveEngagement, setEngagementStage } from "../actions";

export const metadata: Metadata = { title: "Engagement" };

/** The engagement form (OCM-MODULE.md §5.1): statusbar, smart buttons, essentials, chatter. */
export default async function EngagementOverview({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { orgSlug, id } = await params;
  const raw = await searchParams;
  const ctx = await requireEngagementAccess(orgSlug, id);
  const { org, engagement, user, canEdit, isAdmin } = ctx;
  const listParams = parseViewParams(raw, engagementModel);
  const context = listContext(listParams, engagementModel);
  const fromList = Object.keys(raw).length > 0;

  const { team, messages, clients, ids } = await withRls(claimsFor(user), async (tx) => ({
    team: await listEngagementTeam(tx, org.id, engagement.id),
    messages: await listRecordMessages(tx, org.id, "engagement", engagement.id),
    clients: isAdmin ? await listClientOptions(tx, org.id) : [],
    ids: fromList ? await engagementIdsInOrder(tx, org.id, listParams) : [],
  }));

  const base = `/${org.slug}/engagements`;
  const at = ids.indexOf(engagement.id);
  const recordHref = (rid: string) => `${base}/${rid}/overview${context ? `?${context}` : ""}`;
  const pager: Pager | null =
    at >= 0 ? { index: at + 1, total: ids.length, prevHref: at > 0 ? recordHref(ids[at - 1]!) : null, nextHref: at < ids.length - 1 ? recordHref(ids[at + 1]!) : null } : null;
  const bind = <A extends unknown[], R>(fn: (orgSlug: string, id: string, ...rest: A) => R) => fn.bind(null, org.slug, engagement.id);

  const typeOptions = ENGAGEMENT_TYPES.map((t) => ({ value: t, label: ENGAGEMENT_TYPE_LABELS[t] }));
  const clientOptions = isAdmin ? clients.map((c) => ({ value: c.id, label: c.name })) : [{ value: engagement.clientId, label: ctx.clientName }];

  return (
    <FormView
      breadcrumbs={[{ label: "Engagements", href: `${base}${context ? `?${context}` : ""}` }, { label: engagement.name }]}
      pager={pager}
      headerButtons={
        isAdmin ? (
          engagement.status === "active" ? (
            <ActionButton action={bind(archiveEngagement)} label="Archive" pendingLabel="Archiving…" confirmText="Archive this engagement? It becomes read-only until re-activated." />
          ) : (
            <ActionButton action={bind(reactivateEngagement)} label="Re-activate" pendingLabel="Re-activating…" />
          )
        ) : null
      }
      statusbar={
        <Statusbar
          steps={engagementModel.stages!.steps}
          current={engagement.ocmStage}
          canMove={canEdit}
          action={bind(setEngagementStage)}
          incomplete={[]}
        />
      }
      smartButtons={
        <SmartButtons
          buttons={[
            { label: "Team", value: team.length, href: `${base}/${engagement.id}/settings` },
            { label: "Client", value: ctx.clientName, href: `/${org.slug}/clients/${engagement.clientId}` },
          ]}
        />
      }
      chatter={<Chatter messages={messages} noteAction={canEdit ? bind(logEngagementNote) : undefined} />}
    >
      <RecordForm
        canEdit={canEdit}
        action={bind(saveEngagement)}
        titleField="name"
        values={{
          name: engagement.name,
          clientId: engagement.clientId,
          type: engagement.type,
          targetSystem: engagement.targetSystem,
          targetGoLive: engagement.targetGoLive ?? "",
          startDate: engagement.startDate ?? "",
          endDate: engagement.endDate ?? "",
          objectives: engagement.objectives ?? "",
          scopeSummary: engagement.scopeSummary ?? "",
          successCriteria: engagement.successCriteria ?? "",
          transitionOwner: engagement.transitionOwner ?? "",
        }}
        fields={[
          { name: "name", label: "Name", kind: "text", required: true },
          { name: "clientId", label: "Client", kind: "select", required: true, options: clientOptions, readOnly: !isAdmin },
          { name: "type", label: "Type of change", kind: "select", required: true, options: typeOptions, readOnly: !isAdmin },
          { name: "targetSystem", label: "Target system", kind: "text", required: true },
          { name: "targetGoLive", label: "Target go-live", kind: "date" },
          { name: "startDate", label: "Start date", kind: "date" },
          { name: "endDate", label: "End date", kind: "date" },
          { name: "objectives", label: "Objectives", kind: "textarea", placeholder: "What the change must achieve for the client." },
          { name: "scopeSummary", label: "Scope", kind: "textarea", placeholder: "Which sites, departments and processes are in, and what is out." },
          { name: "successCriteria", label: "Success criteria", kind: "textarea", placeholder: "How everyone will know it worked." },
          { name: "transitionOwner", label: "Transition owner", kind: "text", placeholder: "The group taking ownership after go-live" },
        ]}
        groups={[["clientId", "type"], ["targetSystem", "targetGoLive"]]}
        tabs={[
          { key: "essentials", label: "Essentials", fields: ["objectives", "scopeSummary", "successCriteria", "transitionOwner"] },
          { key: "dates", label: "Dates", fields: ["startDate", "endDate"] },
          {
            key: "team",
            label: "Team",
            content: (
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
                emptyText="Nobody is assigned yet. Owners and admins can always open this engagement."
                add={
                  isAdmin ? (
                    <Link href={`${base}/${engagement.id}/settings` as never} className="text-sm text-primary underline-offset-4 hover:underline">
                      Manage the team
                    </Link>
                  ) : null
                }
              />
            ),
          },
        ]}
      />
    </FormView>
  );
}
