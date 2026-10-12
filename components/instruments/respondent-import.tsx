"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Textarea } from "@/components/ui/textarea";
import { idle, type ActionState } from "@/lib/auth/action-state";

/** Paste from a spreadsheet, or choose a CSV file; the file is read in the browser into the box. */
export function RespondentImport({ action, instrumentId }: { action: (prev: ActionState, formData: FormData) => Promise<ActionState>; instrumentId: string }) {
  const [state, formAction, pending] = useActionState(action, idle);
  const [list, setList] = useState("");
  const errors = state.fieldErrors?.list;
  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="instrumentId" value={instrumentId} />
      <label htmlFor="respondent-list" className="text-sm text-muted-foreground">
        Paste a list
      </label>
      <Textarea
        id="respondent-list"
        name="list"
        rows={8}
        value={list}
        onChange={(e) => setList(e.target.value)}
        aria-invalid={errors?.length ? true : undefined}
        placeholder={"name, email, department, role, seniority\nAnn Lee, ann@client.com, Finance, AP clerk, Frontline"}
      />
      <p className="text-sm text-muted-foreground">
        One person per line, comma- or tab-separated (paste straight from a spreadsheet). A header row is optional. Seniority is Frontline,
        Supervisor, Manager or Executive, or blank.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">
          <span className="sr-only">CSV file</span>
          <input
            type="file"
            accept=".csv,.tsv,.txt,text/csv"
            aria-label="CSV file"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) setList(await file.text());
            }}
          />
        </label>
        <Button type="submit" size="sm" disabled={pending || !list.trim()}>
          {pending ? "Adding…" : "Add these people"}
        </Button>
      </div>
      {errors?.length ? (
        <ul role="alert" className="grid gap-0.5 text-sm text-destructive">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
      <FormMessage state={state} />
    </form>
  );
}
