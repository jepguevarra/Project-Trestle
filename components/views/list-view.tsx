"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { idle, type ActionState } from "@/lib/auth/action-state";
import { hrefWith, type ViewParams } from "@/lib/views/params";
import type { GroupData, ModelDef, RowData } from "@/lib/views/types";
import { cn } from "@/lib/utils";

export type BulkAction = { op: string; label: string };

type Props = {
  model: ModelDef;
  params: ViewParams;
  base: string;
  rows: RowData[];
  groups: GroupData[];
  /** Server action for the selection's Action menu; receives `op` and comma-separated `ids`. */
  bulkAction?: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  bulkActions?: BulkAction[];
  emptyText: string;
  /** Hide column sorting and the optional-columns menu (e.g. a dashboard excerpt). */
  plain?: boolean;
};

/**
 * Dense list (OCM-MODULE.md §7.3): left-aligned text, right-aligned numbers, no zebra striping.
 * Grouped rows get collapsible headers with counts and numeric sums. Selecting rows reveals the
 * Action menu.
 */
export function ListView({ model, params, base, rows, groups, bulkAction, bulkActions = [], emptyText, plain }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, fd: FormData) => {
      const result = await bulkAction!(prev, fd);
      if (result.ok) setSelected(new Set());
      return result;
    },
    idle,
  );

  const visible = model.columns.filter((c) => !c.optional || params.cols.includes(c.key));
  const optional = model.columns.filter((c) => c.optional);
  const selectable = !plain && bulkAction && bulkActions.length > 0;
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Keep the last action's message even when it emptied the list (e.g. archiving every row).
  if (rows.length === 0) {
    return (
      <div className="grid gap-2">
        {state.message ? <FormMessage state={state} /> : null}
        <p className="py-6 text-sm text-muted-foreground">{emptyText}</p>
      </div>
    );
  }

  const sortHref = (key: string) =>
    hrefWith(base, params, model, {
      page: 1,
      order: { field: key, dir: params.order.field === key && params.order.dir === "asc" ? "desc" : "asc" },
    });
  const colsHref = (key: string) =>
    hrefWith(base, params, model, { cols: params.cols.includes(key) ? params.cols.filter((c) => c !== key) : [...params.cols, key] });

  const span = visible.length + (selectable ? 1 : 0);
  let lastGroup: string | undefined;

  return (
    <div className="grid gap-2">
      {selectable && selected.size > 0 ? (
        <form action={formAction} className="flex flex-wrap items-center gap-2 text-sm">
          <input type="hidden" name="ids" value={[...selected].join(",")} />
          <span className="font-semibold">{selected.size} selected</span>
          {bulkActions.map((a) => (
            <Button key={a.op} type="submit" name="op" value={a.op} variant="outline" size="sm" disabled={pending}>
              {a.label}
            </Button>
          ))}
          <button type="button" className="text-muted-foreground underline-offset-4 hover:underline" onClick={() => setSelected(new Set())}>
            Clear
          </button>
          <FormMessage state={state} />
        </form>
      ) : state.message ? (
        <FormMessage state={state} />
      ) : null}

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {selectable ? (
                <th scope="col" className="w-8 border-b border-border px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}
                  />
                </th>
              ) : null}
              {visible.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={params.order.field === c.key ? (params.order.dir === "asc" ? "ascending" : "descending") : undefined}
                  className={cn(
                    "border-b border-border px-3 py-2 text-left font-semibold whitespace-nowrap text-muted-foreground",
                    c.numeric && "text-right",
                  )}
                >
                  {c.sortable && !plain ? (
                    <Link href={sortHref(c.key) as never} className="hover:text-foreground">
                      {c.label}
                      {params.order.field === c.key ? (params.order.dir === "asc" ? " ↑" : " ↓") : ""}
                    </Link>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
              {optional.length && !plain ? (
                <th scope="col" className="w-0 border-b border-border px-2 py-2 text-right">
                  <details className="relative inline-block text-left">
                    <summary className="cursor-pointer list-none px-1 text-muted-foreground hover:text-foreground" aria-label="Optional columns">
                      ⋮
                    </summary>
                    <div className="absolute right-0 z-20 mt-1 min-w-40 rounded-md border border-border bg-card p-1 font-normal">
                      {optional.map((c) => (
                        <Link key={c.key} href={colsHref(c.key) as never} className="block rounded px-2 py-1.5 hover:bg-muted">
                          {params.cols.includes(c.key) ? "✓ " : ""}
                          {c.label}
                        </Link>
                      ))}
                    </div>
                  </details>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const header =
                params.groupBy && r.group !== lastGroup
                  ? (() => {
                      lastGroup = r.group;
                      const g = groups.find((x) => x.key === (r.group ?? ""));
                      const isCollapsed = collapsed.has(r.group ?? "");
                      return (
                        <tr key={`g-${r.group}`} className="bg-muted">
                          <td colSpan={span + (optional.length && !plain ? 1 : 0)} className="border-b border-border px-3 py-1.5">
                            <button
                              type="button"
                              aria-expanded={!isCollapsed}
                              className="flex w-full items-center gap-3 text-left font-semibold"
                              onClick={() =>
                                setCollapsed((s) => {
                                  const next = new Set(s);
                                  const k = r.group ?? "";
                                  if (next.has(k)) next.delete(k);
                                  else next.add(k);
                                  return next;
                                })
                              }
                            >
                              <span aria-hidden>{isCollapsed ? "▸" : "▾"}</span>
                              <span>
                                {g?.label ?? r.group} <span className="font-normal text-muted-foreground tabular-nums">({g?.count ?? 0})</span>
                              </span>
                              {Object.entries(g?.sums ?? {}).map(([k, v]) => (
                                <span key={k} className="ml-auto font-normal tabular-nums text-muted-foreground">
                                  {model.columns.find((c) => c.key === k)?.label}: {v}
                                </span>
                              ))}
                            </button>
                          </td>
                        </tr>
                      );
                    })()
                  : null;
              const hidden = params.groupBy ? collapsed.has(r.group ?? "") : false;
              return [
                header,
                hidden ? null : (
                  <tr
                    key={r.id}
                    className="cursor-pointer hover:bg-muted"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("a,button,input,label")) return;
                      router.push(r.href as never);
                    }}
                  >
                    {selectable ? (
                      <td className="border-b border-border px-3 py-2">
                        <input type="checkbox" aria-label={`Select ${r.cells[visible[0]!.key]}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                      </td>
                    ) : null}
                    {visible.map((c, i) => (
                      <td key={c.key} className={cn("border-b border-border px-3 py-2 align-top", c.numeric && "text-right tabular-nums")}>
                        {i === 0 ? (
                          <Link href={r.href as never} className="text-primary underline-offset-4 hover:underline">
                            {r.cells[c.key] ?? "—"}
                          </Link>
                        ) : (
                          (r.cells[c.key] ?? "—")
                        )}
                      </td>
                    ))}
                    {optional.length && !plain ? <td className="border-b border-border" /> : null}
                  </tr>
                ),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
