import type { Metadata } from "next";
import { HomeMenu } from "@/components/views/home-menu";
import { requireEngagementAccess } from "@/lib/auth/engagement";

export const metadata: Metadata = { title: "Engagement" };

/** The engagement's home menu: its apps, grouped by OCM phase. */
export default async function EngagementHome({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const { orgSlug, id } = await params;
  const { org, engagement, clientName } = await requireEngagementAccess(orgSlug, id);
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl font-semibold">{engagement.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {clientName} · {engagement.targetSystem}
        </p>
      </div>
      <HomeMenu base={`/${org.slug}/engagements/${engagement.id}`} stage={engagement.ocmStage} />
    </div>
  );
}
