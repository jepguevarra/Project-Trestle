import Link from "next/link";
import type { ReactNode } from "react";
import { requireEngagementAccess } from "@/lib/auth/engagement";
import { ENGAGEMENT_TYPE_LABELS } from "@/lib/validation/engagements";

// The engagement shell. Later phases add their module links to `modules`; a module that is not
// built yet has no link at all (not a disabled one).
export default async function EngagementLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = await params;
  const { org, engagement, clientName } = await requireEngagementAccess(orgSlug, id);
  const base = `/${org.slug}/engagements/${engagement.id}`;
  const modules: { href: string; label: string }[] = [{ href: base, label: "Overview" }];

  return (
    <div className="grid gap-6">
      <header className="grid gap-1 border-b border-border pb-4">
        <p className="text-sm text-muted-foreground">
          <Link href={`/${org.slug}/engagements` as never} className="underline-offset-4 hover:underline">
            Engagements
          </Link>
          {" / "}
          <Link href={`/${org.slug}/clients/${engagement.clientId}` as never} className="underline-offset-4 hover:underline">
            {clientName}
          </Link>
        </p>
        <h1 className="text-xl font-semibold">{engagement.name}</h1>
        <p className="text-sm text-muted-foreground">
          {ENGAGEMENT_TYPE_LABELS[engagement.type]} · {engagement.targetSystem}
          {engagement.targetGoLive ? ` · go-live ${engagement.targetGoLive}` : ""}
        </p>
        {engagement.status === "archived" ? (
          <p role="status" className="mt-2 rounded-md border border-border bg-muted px-3 py-2 text-sm">
            Archived. Everything here is read-only and stays readable.
          </p>
        ) : null}
        <nav aria-label="Engagement" className="mt-2 flex gap-1 text-sm">
          {modules.map((m) => (
            <Link key={m.href} href={m.href as never} className="rounded-md px-2 py-1 hover:bg-muted">
              {m.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}
