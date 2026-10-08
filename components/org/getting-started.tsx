import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

type Step = { title: string; body: string; href: string; action: string; done: boolean };

/** The admin's first-run checklist. Disappears once every step is done. */
export function GettingStarted({
  orgSlug,
  progress,
}: {
  orgSlug: string;
  progress: { hasClient: boolean; hasEngagement: boolean; hasTeammate: boolean; hasAssignment: boolean; firstEngagementId: string | null };
}) {
  const base = `/${orgSlug}`;
  const steps: Step[] = [
    {
      title: "Add a client",
      body: "The company you are preparing for a new system, for example a distributor moving onto Odoo.",
      href: `${base}/clients/new`,
      action: "Add a client",
      done: progress.hasClient,
    },
    {
      title: "Create an engagement",
      body: "One piece of work for that client: the system being introduced, its type and a target go-live date. Everything else in Trestle hangs off an engagement.",
      href: `${base}/engagements/new`,
      action: "Create an engagement",
      done: progress.hasEngagement,
    },
    {
      title: "Invite your team",
      body: "Colleagues who will run the work join as consultants. The client's sponsor can join as a viewer and see only their own engagement.",
      href: `${base}/settings/members#invite-heading`,
      action: "Invite someone",
      done: progress.hasTeammate,
    },
    {
      title: "Put people on the engagement",
      body: "Consultants and viewers only see the engagements they are added to. Owners and admins see everything.",
      href: progress.firstEngagementId ? `${base}/engagements/${progress.firstEngagementId}/settings` : `${base}/engagements`,
      action: "Open the engagement",
      done: progress.hasAssignment,
    },
  ];
  if (steps.every((s) => s.done)) return null;
  const next = steps.findIndex((s) => !s.done);

  return (
    <section aria-labelledby="getting-started" className="rounded-md border border-border bg-card p-4">
      <h2 id="getting-started" className="text-sm font-semibold">
        Getting started
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Four steps set up your first engagement. {steps.filter((s) => s.done).length} of 4 done.
      </p>
      <ol className="mt-4 grid gap-4">
        {steps.map((s, i) => (
          <li key={s.title} className="grid gap-1 sm:grid-cols-[2rem_1fr_auto] sm:items-start sm:gap-3">
            <span className="text-sm font-semibold tabular-nums text-muted-foreground">{i + 1}.</span>
            <div>
              <p className={s.done ? "text-sm text-muted-foreground line-through" : "text-sm font-semibold"}>{s.title}</p>
              {!s.done ? <p className="text-sm text-muted-foreground">{s.body}</p> : null}
            </div>
            {s.done ? (
              <span className="text-sm text-muted-foreground">Done</span>
            ) : (
              <Link href={s.href as never} className={buttonVariants({ size: "sm", variant: i === next ? "default" : "outline" })}>
                {s.action}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
