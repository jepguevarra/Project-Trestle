"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { idle, type ActionState } from "@/lib/auth/action-state";
import type { StageDef } from "@/lib/views/types";
import { cn } from "@/lib/utils";

/**
 * The Odoo statusbar as text steps (OCM-MODULE.md §7.5): the current step in the accent colour,
 * clickable where the user may move it. Moving asks for confirmation and lists what is still
 * incomplete. It warns; it never blocks (§4.1).
 */
export function Statusbar({
  steps,
  current,
  canMove,
  action,
  incomplete,
}: {
  steps: StageDef[];
  current: string;
  canMove: boolean;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  /** What is incomplete before leaving the current stage. Filled by later phases (14, 13). */
  incomplete: string[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [target, setTarget] = useState<StageDef | null>(null);
  const [state, formAction, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await action(prev, fd);
    if (result.ok) dialog.current?.close();
    return result;
  }, idle);

  return (
    <>
      <ol aria-label="Stage" className="flex flex-wrap items-center text-sm">
        {steps.map((s, i) => {
          const isCurrent = s.value === current;
          const content = (
            <span className={cn("px-2 py-1", isCurrent ? "font-semibold text-primary" : "text-muted-foreground")}>{s.label}</span>
          );
          return (
            <li key={s.value} aria-current={isCurrent ? "step" : undefined} className="flex items-center">
              {i > 0 ? <span aria-hidden className="text-muted-foreground">›</span> : null}
              {canMove && !isCurrent ? (
                <button
                  type="button"
                  className="rounded hover:bg-muted"
                  onClick={() => {
                    setTarget(s);
                    dialog.current?.showModal();
                  }}
                >
                  {content}
                </button>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ol>
      <dialog ref={dialog} aria-labelledby="stage-dialog-title" className="m-auto w-full max-w-md rounded-md border border-border bg-card p-0 text-foreground backdrop:bg-black/30">
        <form action={formAction} className="grid gap-3 p-5">
          <h2 id="stage-dialog-title" className="text-xl font-semibold">
            Move to {target?.label}?
          </h2>
          <input type="hidden" name="stage" value={target?.value ?? ""} />
          {incomplete.length ? (
            <div className="text-sm">
              <p>Still incomplete:</p>
              <ul className="mt-1 list-disc pl-5">
                {incomplete.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nothing is tracked as incomplete yet. Checklist tasks and milestone gates will be listed here once those
              modules exist. You can move back at any time.
            </p>
          )}
          <FormMessage state={state} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => dialog.current?.close()}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Moving…" : `Move to ${target?.label ?? ""}`}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
