"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { hrefWith, type ViewParams } from "@/lib/views/params";
import type { ModelDef } from "@/lib/views/types";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; href?: string };

const menuLink = "block rounded px-2 py-1.5 text-sm hover:bg-muted aria-[current=true]:font-semibold";

/** A plain disclosure menu: no client JS beyond the native <details>. */
function Menu({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details className="group relative">
      <summary className="flex h-8 cursor-pointer list-none items-center gap-1 rounded-md border border-border bg-card px-3 text-sm hover:bg-muted">
        {label}
        <span aria-hidden className="text-muted-foreground group-open:rotate-180">▾</span>
      </summary>
      <div className="absolute left-0 z-20 mt-1 min-w-52 rounded-md border border-border bg-card p-1">{children}</div>
    </details>
  );
}

/**
 * The two rows above every collection view (OCM-MODULE.md §7.2): breadcrumbs and New; then search
 * with facets, Filters, Group by, the view switcher and the pager. All state lives in the URL.
 */
export function ControlPanel({
  model,
  params,
  base,
  total,
  breadcrumbs,
  newHref,
}: {
  model: ModelDef;
  params: ViewParams;
  base: string;
  total: number;
  breadcrumbs: Crumb[];
  newHref?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const listboxId = useId();
  const href = (patch: Partial<ViewParams>) => hrefWith(base, params, model, { page: 1, ...patch });

  const addFacet = (field: string) => {
    const value = query.trim();
    if (!value) return;
    setQuery("");
    router.push(href({ facets: [...params.facets, { field, value }] }) as never);
  };

  const toggleFilter = (key: string) =>
    href({ filters: params.filters.includes(key) ? params.filters.filter((f) => f !== key) : [...params.filters, key] });

  const from = total === 0 ? 0 : (params.page - 1) * params.limit + 1;
  const to = Math.min(params.page * params.limit, total);
  const groups = [...new Set(model.filters.map((f) => f.group))];

  return (
    <div className="grid gap-3 border-b border-border pb-3">
      <div className="flex flex-wrap items-center gap-3">
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
        {newHref ? (
          <Link href={newHref as never} className={buttonVariants({ size: "sm" })}>
            New
          </Link>
        ) : null}
        <button
          type="button"
          className="ml-auto rounded-md border border-border px-3 py-1 text-sm md:hidden"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          Search and filters
        </button>
      </div>

      <div className={cn("flex-wrap items-center gap-2", open ? "flex" : "hidden md:flex")}>
        <div className="relative min-w-60 flex-1">
          <div className="flex min-h-8 flex-wrap items-center gap-1 rounded-md border border-input bg-card px-2 py-1">
            {params.facets.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded border border-border px-1.5 text-sm">
                <span className="text-muted-foreground">{model.facets.find((x) => x.key === f.field)?.label}:</span> {f.value}
                <Link
                  href={href({ facets: params.facets.filter((_, j) => j !== i) }) as never}
                  aria-label={`Remove ${f.value}`}
                  className="px-0.5 text-muted-foreground hover:text-foreground"
                >
                  ×
                </Link>
              </span>
            ))}
            <input
              type="search"
              role="combobox"
              aria-expanded={query.trim().length > 0}
              aria-controls={listboxId}
              aria-label={`Search ${model.plural.toLowerCase()}`}
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addFacet(model.facets[0]!.key);
                }
              }}
              className="h-6 min-w-24 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          {query.trim() ? (
            <ul id={listboxId} role="listbox" className="absolute z-20 mt-1 w-full rounded-md border border-border bg-card p-1">
              {model.facets.map((f) => (
                <li key={f.key} role="option" aria-selected={false}>
                  <button type="button" onClick={() => addFacet(f.key)} className={cn(menuLink, "w-full text-left")}>
                    Search <span className="font-semibold">{f.label}</span> for: {query.trim()}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {model.filters.length ? (
          <Menu label={params.filters.length ? `Filters (${params.filters.length})` : "Filters"}>
            {groups.map((g, i) => (
              <div key={g} className={i > 0 ? "mt-1 border-t border-border pt-1" : undefined}>
                {model.filters
                  .filter((f) => f.group === g)
                  .map((f) => (
                    <Link key={f.key} href={toggleFilter(f.key) as never} aria-current={params.filters.includes(f.key)} className={menuLink}>
                      {params.filters.includes(f.key) ? "✓ " : ""}
                      {f.label}
                    </Link>
                  ))}
              </div>
            ))}
            {params.filters.length ? (
              <Link href={href({ filters: [] }) as never} className={cn(menuLink, "mt-1 border-t border-border text-muted-foreground")}>
                Clear filters
              </Link>
            ) : null}
          </Menu>
        ) : null}

        {model.groupBys.length ? (
          <Menu label={params.groupBy ? `Group by: ${model.groupBys.find((g) => g.key === params.groupBy)?.label}` : "Group by"}>
            {model.groupBys.map((g) => (
              <Link key={g.key} href={href({ groupBy: g.key }) as never} aria-current={params.groupBy === g.key} className={menuLink}>
                {g.label}
              </Link>
            ))}
            {params.groupBy ? (
              <Link href={href({ groupBy: null }) as never} className={cn(menuLink, "mt-1 border-t border-border text-muted-foreground")}>
                No grouping
              </Link>
            ) : null}
          </Menu>
        ) : null}

        {model.views.length > 1 ? (
          <div role="group" aria-label="View" className="flex overflow-hidden rounded-md border border-border">
            {model.views.map((v) => (
              <Link
                key={v}
                href={href({ view: v }) as never}
                aria-current={params.view === v ? "page" : undefined}
                className="px-3 py-1 text-sm capitalize hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:font-semibold"
              >
                {v}
              </Link>
            ))}
          </div>
        ) : null}

        {params.view === "list" ? (
          <div className="ml-auto flex items-center gap-1 text-sm tabular-nums">
            <span aria-live="polite">
              {from}–{to} / {total}
            </span>
            <Link
              aria-label="Previous page"
              aria-disabled={params.page <= 1}
              href={href({ page: Math.max(1, params.page - 1) }) as never}
              className="rounded px-2 hover:bg-muted aria-disabled:pointer-events-none aria-disabled:opacity-40"
            >
              ‹
            </Link>
            <Link
              aria-label="Next page"
              aria-disabled={to >= total}
              href={href({ page: params.page + 1 }) as never}
              className="rounded px-2 hover:bg-muted aria-disabled:pointer-events-none aria-disabled:opacity-40"
            >
              ›
            </Link>
          </div>
        ) : (
          <span className="ml-auto text-sm tabular-nums text-muted-foreground">{total} records</span>
        )}
      </div>
    </div>
  );
}
