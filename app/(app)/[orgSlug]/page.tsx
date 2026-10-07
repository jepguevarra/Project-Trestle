import Link from "next/link";
import { EngagementTable } from "@/components/engagements/engagement-table";
import { GettingStarted } from "@/components/org/getting-started";
import { requireMembership } from "@/lib/auth/membership";
import { hasRole, ROLE_LABELS } from "@/lib/auth/roles";
import { claimsFor } from "@/lib/auth/session";
import { withRls } from "@/lib/db";
import { listRecentActiveEngagements } from "@/lib/db/queries/engagements";
import { getSetupProgress } from "@/lib/db/queries/onboarding";

const ROLE_INTRO = {
  consultant: "You run the engagements you have been added to. They are listed below; open one to work on it.",
  viewer: "You can read the engagements you have been added to. They are listed below.",
} as const;

export default async function OrgDashboard({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { user, org, role } = await requireMembership((await params).orgSlug);
  const isAdmin = hasRole(role, "admin");
  const { engagements, progress } = await withRls(claimsFor(user), async (tx) => ({
    engagements: await listRecentActiveEngagements(tx, org.id),
    progress: isAdmin ? await getSetupProgress(tx, org.id) : null,
  }));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-xl font-semibold">{org.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin
            ? "Trestle holds the work you do with a client before their new system goes live."
            : `You are a ${ROLE_LABELS[role].toLowerCase()} here. ${ROLE_INTRO[role as "consultant" | "viewer"]}`}
        </p>
      </div>

      {progress ? <GettingStarted orgSlug={org.slug} progress={progress} /> : null}

      <section aria-labelledby="recent-heading" className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="recent-heading" className="text-sm font-semibold">
            Active engagements
          </h2>
          <Link href={`/${org.slug}/engagements` as never} className="text-sm text-primary underline-offset-4 hover:underline">
            All engagements
          </Link>
        </div>
        {engagements.length ? (
          <EngagementTable orgSlug={org.slug} rows={engagements} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "None yet. The checklist above walks you through creating the first one."
              : "You have not been added to any active engagement yet. Ask an admin in your firm to add you."}
          </p>
        )}
      </section>
    </div>
  );
}
