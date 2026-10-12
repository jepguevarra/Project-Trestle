import Link from "next/link";
import type { ReactNode } from "react";
import type { Crumb } from "./control-panel";

export type Pager = { index: number; total: number; prevHref: string | null; nextHref: string | null };

/**
 * The form layout (OCM-MODULE.md §7.5): breadcrumbs and record pager; header buttons and
 * statusbar; smart buttons; the sheet; chatter beside it on wide screens and below it on narrow.
 */
export function FormView({
  breadcrumbs,
  pager,
  headerButtons,
  statusbar,
  smartButtons,
  children,
  chatter,
}: {
  breadcrumbs: Crumb[];
  pager?: Pager | null;
  headerButtons?: ReactNode;
  statusbar?: ReactNode;
  smartButtons?: ReactNode;
  children: ReactNode;
  chatter?: ReactNode;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-3">
        <nav aria-label="Breadcrumb" className="text-sm">
          {breadcrumbs.map((c, i) => (
            <span key={i}>
              {i > 0 ? <span className="px-1 text-muted-foreground">/</span> : null}
              {c.href ? (
                <Link href={c.href as never} className="text-muted-foreground underline-offset-4 hover:underline">
                  {c.label}
                </Link>
              ) : (
                <span className="font-semibold">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
        {pager ? (
          <div className="ml-auto flex items-center gap-1 text-sm tabular-nums" aria-label="Record pager">
            <span>
              {pager.index} / {pager.total}
            </span>
            <Link
              aria-label="Previous record"
              aria-disabled={!pager.prevHref}
              href={(pager.prevHref ?? "#") as never}
              className="rounded px-2 hover:bg-muted aria-disabled:pointer-events-none aria-disabled:opacity-40"
            >
              ‹
            </Link>
            <Link
              aria-label="Next record"
              aria-disabled={!pager.nextHref}
              href={(pager.nextHref ?? "#") as never}
              className="rounded px-2 hover:bg-muted aria-disabled:pointer-events-none aria-disabled:opacity-40"
            >
              ›
            </Link>
          </div>
        ) : null}
      </div>

      {headerButtons || statusbar ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">{headerButtons}</div>
          <div className="ml-auto">{statusbar}</div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid content-start gap-4 rounded-md border border-border bg-card p-4">
          {smartButtons}
          {children}
        </div>
        {chatter ? <aside aria-label="Chatter">{chatter}</aside> : null}
      </div>
    </div>
  );
}
