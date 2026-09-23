import { requireMembership } from "@/lib/auth/membership";

export default async function OrgDashboard({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { org } = await requireMembership((await params).orgSlug);
  return (
    <section>
      <h1 className="text-xl font-semibold">{org.name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Clients and engagements arrive in phase 02. For now, invite your team from Members.
      </p>
    </section>
  );
}
