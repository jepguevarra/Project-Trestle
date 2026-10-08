import Link from "next/link";
import { OCM_STAGE_LABELS, type OcmStage } from "@/lib/views/engagement";
import { CurrentAppLabel } from "./current-app-label";

type Switchable = { id: string; name: string; clientName: string; status: "active" | "archived" };

/**
 * The engagement navbar (OCM-MODULE.md §7.1): apps button · current app · stage indicator ·
 * engagement switcher. The switcher lists only engagements the user can open (RLS).
 */
export function EngagementNavbar({
  orgSlug,
  engagement,
  switcher,
}: {
  orgSlug: string;
  engagement: { id: string; name: string; ocmStage: OcmStage; status: "active" | "archived" };
  switcher: Switchable[];
}) {
  const home = `/${orgSlug}/engagements/${engagement.id}`;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border pb-3">
      <Link href={home as never} className="rounded-md border border-border bg-card px-3 py-1 text-sm hover:bg-muted">
        Apps
      </Link>
      <p className="text-sm">
        <span className="font-semibold">{engagement.name}</span>
        <CurrentAppLabel />
      </p>
      <div className="ml-auto flex flex-wrap items-center gap-3 text-sm">
        <span>
          <span className="text-muted-foreground">Stage </span>
          <span className="font-semibold">{OCM_STAGE_LABELS[engagement.ocmStage]}</span>
          {engagement.status === "archived" ? <span className="text-muted-foreground"> · Archived</span> : null}
        </span>
        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md border border-border bg-card px-3 py-1 hover:bg-muted">
            Switch engagement <span aria-hidden className="text-muted-foreground group-open:rotate-180">▾</span>
          </summary>
          <div className="absolute right-0 z-20 mt-1 max-h-80 w-72 overflow-y-auto rounded-md border border-border bg-card p-1">
            {switcher.map((e) => (
              <Link
                key={e.id}
                href={`/${orgSlug}/engagements/${e.id}` as never}
                aria-current={e.id === engagement.id ? "page" : undefined}
                className="block rounded px-2 py-1.5 hover:bg-muted aria-[current=page]:font-semibold"
              >
                {e.name}
                <span className="block text-muted-foreground">
                  {e.clientName}
                  {e.status === "archived" ? " · Archived" : ""}
                </span>
              </Link>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
