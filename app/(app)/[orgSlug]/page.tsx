import Link from "next/link";
import { EngagementTable } from "@/components/engagements/engagement-table";
import { requireMembership } from "@/lib/auth/membership";
import { hasRole } from "@/lib/auth/roles";
import { claimsFor } from "@/lib/auth/session";
import { withRls } from "@/lib/db";
import { listRecentActiveEngagements } from "@/lib/db/queries/engagements";

export default async function OrgDashboard({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { user, org, role } = await requireMembership((await params).orgSlug);
  const engagements = await withRls(claimsFor(user), (tx) => listRecentActiveEngagements(tx, org.id));

  return (
    <div className="grid gap-6">
      <h1 className="text-xl font-semibold">{org.name}</h1>
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
            {hasRole(role, "admin")
              ? "No active engagements. Add a client, then create an engagement for it."
              : "You are not assigned to any active engagements yet."}
          </p>
        )}
      </section>
    </div>
  );
}
