import Link from "next/link";
import { ENGAGEMENT_APPS, type AppDef } from "@/lib/views/apps";
import { OCM_STAGE_LABELS, OCM_STAGES, type OcmStage } from "@/lib/views/engagement";

const SECTION_LABELS: Record<AppDef["section"], string> = { engagement: "Engagement", ...OCM_STAGE_LABELS };

/**
 * The engagement's apps as a plain text grid under the five phase headings, with the current
 * stage's apps first (OCM-MODULE.md §7.1). Apps not built yet are disabled tiles that say which
 * phase delivers them.
 */
export function HomeMenu({ base, stage }: { base: string; stage: OcmStage }) {
  const order: AppDef["section"][] = ["engagement", stage, ...OCM_STAGES.filter((s) => s !== stage)];
  return (
    <div className="grid gap-6">
      {order.map((section) => {
        const apps = ENGAGEMENT_APPS.filter((a) => a.section === section);
        if (!apps.length) return null;
        return (
          <section key={section} aria-labelledby={`apps-${section}`} className="grid gap-2">
            <h2 id={`apps-${section}`} className="text-sm font-semibold">
              {SECTION_LABELS[section]}
              {section === stage ? <span className="font-normal text-muted-foreground"> · current stage</span> : null}
            </h2>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {apps.map((a) =>
                a.route ? (
                  <li key={a.key}>
                    <Link
                      href={`${base}/${a.route}` as never}
                      className="block h-full rounded-md border border-border bg-card px-3 py-3 text-sm font-semibold hover:bg-muted"
                    >
                      {a.label}
                    </Link>
                  </li>
                ) : (
                  <li key={a.key}>
                    <div aria-disabled className="h-full rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
                      {a.label}
                      <span className="block">Arrives in phase {a.deliveredBy}</span>
                    </div>
                  </li>
                ),
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
