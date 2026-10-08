"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { idle, type ActionState } from "@/lib/auth/action-state";
import type { ModelDef, RowData } from "@/lib/views/types";
import { cn } from "@/lib/utils";

type MoveAction = (orgSlug: string, id: string, prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Kanban by the model's stage field (OCM-MODULE.md §7.4). Dragging a card calls the same server
 * action as the form's statusbar, so validation and chatter tracking are identical. Cards the user
 * may not move are not draggable; the server refuses a crafted move anyway. A "Move to" select on
 * each movable card does the same for keyboards and phones, where drag and drop is unavailable.
 */
export function KanbanView({
  model,
  rows,
  orgSlug,
  moveAction,
  cardFields,
}: {
  model: ModelDef;
  rows: RowData[];
  orgSlug: string;
  moveAction: MoveAction;
  cardFields: string[];
}) {
  const stages = model.stages!;
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [optimistic, moveOptimistic] = useOptimistic(rows, (state, m: { id: string; stage: string }) =>
    state.map((r) => (r.id === m.id ? { ...r, stage: m.stage } : r)),
  );

  const move = (id: string, stage: string) => {
    const row = optimistic.find((r) => r.id === id);
    if (!row || !row.canMove || row.stage === stage) return;
    setError(null);
    startTransition(async () => {
      moveOptimistic({ id, stage });
      const fd = new FormData();
      fd.set("stage", stage);
      const result = await moveAction(orgSlug, id, idle, fd);
      if (!result.ok) setError(result.message ?? "That move was not allowed.");
    });
  };

  return (
    <div className="grid gap-2">
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {stages.steps.map((step) => {
          const cards = optimistic.filter((r) => r.stage === step.value);
          return (
            <section
              key={step.value}
              aria-label={step.label}
              data-stage={step.value}
              onDragOver={(e) => {
                if (dragging) {
                  e.preventDefault();
                  setOver(step.value);
                }
              }}
              onDragLeave={() => setOver((o) => (o === step.value ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                setOver(null);
                setDragging(null);
                move(id, step.value);
              }}
              className={cn(
                "flex w-56 shrink-0 flex-col gap-2 rounded-md border border-border bg-muted p-2",
                over === step.value && "border-ring",
              )}
            >
              <h3 className="flex items-baseline justify-between px-1 text-sm font-semibold">
                {step.label}
                <span className="font-normal text-muted-foreground tabular-nums">{cards.length}</span>
              </h3>
              {cards.map((r) => (
                <article
                  key={r.id}
                  draggable={r.canMove}
                  aria-roledescription={r.canMove ? "Draggable card" : undefined}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", r.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDragging(r.id);
                  }}
                  onDragEnd={() => setDragging(null)}
                  data-card={r.id}
                  className={cn(
                    "grid gap-1 rounded-md border border-border bg-card p-2 text-sm",
                    r.canMove && "cursor-grab",
                    dragging === r.id && "opacity-50",
                  )}
                >
                  <Link href={r.href as never} className="font-semibold text-primary underline-offset-4 hover:underline">
                    {r.cells[cardFields[0]!]}
                  </Link>
                  {cardFields.slice(1).map((f) =>
                    r.cells[f] ? (
                      <span key={f} className="text-muted-foreground">
                        {r.cells[f]}
                      </span>
                    ) : null,
                  )}
                  {r.canMove ? (
                    <label className="mt-1 flex items-center gap-2 text-muted-foreground">
                      <span className="sr-only">Move {String(r.cells[cardFields[0]!])} to</span>
                      <select
                        value={r.stage}
                        onChange={(e) => move(r.id, e.target.value)}
                        className="h-7 rounded border border-input bg-card px-1 text-sm"
                      >
                        {stages.steps.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </article>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
