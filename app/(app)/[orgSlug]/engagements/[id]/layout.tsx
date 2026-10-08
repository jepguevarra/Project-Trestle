import type { ReactNode } from "react";
import { EngagementNavbar } from "@/components/views/engagement-navbar";
import { requireEngagementAccess } from "@/lib/auth/engagement";
import { claimsFor } from "@/lib/auth/session";
import { withRls } from "@/lib/db";
import { listSwitcherEngagements } from "@/lib/db/queries/engagement-collection";

// The engagement app shell: navbar on every page under /engagements/[id]. Anyone without access
// gets a 404 from requireEngagementAccess, including a consultant who is not assigned.
export default async function EngagementLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = await params;
  const { org, user, engagement } = await requireEngagementAccess(orgSlug, id);
  const switcher = await withRls(claimsFor(user), (tx) => listSwitcherEngagements(tx, org.id));

  return (
    <div className="grid gap-4">
      <EngagementNavbar orgSlug={org.slug} engagement={engagement} switcher={switcher} />
      {engagement.status === "archived" ? (
        <p role="status" className="rounded-md border border-border bg-muted px-3 py-2 text-sm">
          Archived. Everything here is read-only and stays readable.
        </p>
      ) : null}
      {children}
    </div>
  );
}
