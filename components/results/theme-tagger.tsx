"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { idle, type ActionState } from "@/lib/auth/action-state";

type Act = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/** One open answer's themes, tagged by hand: remove one, or add one (existing themes are suggested). */
export function ThemeTagger({
  instrumentId,
  responseId,
  themes,
  suggestions,
  addAction,
  removeAction,
  canEdit,
}: {
  instrumentId: string;
  responseId: string;
  themes: { id: string; theme: string }[];
  suggestions: string[];
  addAction: Act;
  removeAction: Act;
  canEdit: boolean;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, add, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const r = await addAction(prev, fd);
    if (r.ok) ref.current?.reset();
    return r;
  }, idle);
  const [, remove] = useActionState(removeAction, idle);
  const listId = `themes-${responseId}`;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {themes.length === 0 && !canEdit ? <span className="text-muted-foreground">No themes.</span> : null}
      {themes.map((t) =>
        canEdit ? (
          <form key={t.id} action={remove} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5">
            <input type="hidden" name="instrumentId" value={instrumentId} />
            <input type="hidden" name="themeId" value={t.id} />
            <span>{t.theme}</span>
            <button type="submit" aria-label={`Remove theme ${t.theme}`} className="text-muted-foreground hover:text-foreground">
              ×
            </button>
          </form>
        ) : (
          <span key={t.id} className="rounded-md border border-border px-2 py-0.5">
            {t.theme}
          </span>
        ),
      )}
      {canEdit ? (
        <form ref={ref} action={add} className="inline-flex items-center gap-1">
          <input type="hidden" name="instrumentId" value={instrumentId} />
          <input type="hidden" name="responseId" value={responseId} />
          <Input name="theme" list={listId} aria-label="Add a theme" placeholder="Add a theme" className="h-8 w-40" required maxLength={60} />
          <datalist id={listId}>
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <Button type="submit" variant="ghost" size="sm" disabled={pending}>
            Tag
          </Button>
          {!state.ok && state.fieldErrors?.theme ? <span className="text-destructive">{state.fieldErrors.theme[0]}</span> : null}
        </form>
      ) : null}
    </div>
  );
}
