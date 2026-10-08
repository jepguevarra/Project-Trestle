"use client";

import { useActionState, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { idle, type ActionState } from "@/lib/auth/action-state";
import { cn } from "@/lib/utils";

export type FieldDef = {
  name: string;
  label: string;
  kind: "text" | "textarea" | "date" | "select" | "number" | "datetime";
  options?: { value: string; label: string }[];
  /** Shown but never editable (e.g. type for non-admins). */
  readOnly?: boolean;
  required?: boolean;
  placeholder?: string;
};

export type Tab = { key: string; label: string; fields?: string[]; content?: ReactNode };

type Props = {
  fields: FieldDef[];
  values: Record<string, string>;
  /** Field rendered large at the top of the sheet, Odoo's record title. */
  titleField?: string;
  /** Two-column field groups under the title. */
  groups: string[][];
  tabs?: Tab[];
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  canEdit: boolean;
  mode?: "edit" | "create";
  hidden?: Record<string, string>;
  discardHref?: string;
};

/**
 * Edit in place (OCM-MODULE.md §7.5): the sheet is editable when the user has edit access; Save and
 * Discard appear on the first change. Read-only users see plain values. Fields can sit in the main
 * groups or in notebook tabs; a tab can instead carry other content, such as an inline list.
 */
export function RecordForm({
  fields,
  values: initial,
  titleField,
  groups,
  tabs = [],
  action,
  canEdit,
  mode = "edit",
  hidden = {},
  discardHref,
}: Props) {
  const [saved, setSaved] = useState(initial);
  const [values, setValues] = useState(initial);
  const [tab, setTab] = useState(tabs[0]?.key);
  const [, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await action(prev, fd);
    if (result.ok) setSaved(Object.fromEntries(fd.entries()) as Record<string, string>);
    return result;
  }, idle);

  const byName = new Map(fields.map((f) => [f.name, f]));
  const dirty = mode === "create" || fields.some((f) => (values[f.name] ?? "") !== (saved[f.name] ?? ""));
  const editable = (f: FieldDef) => canEdit && !f.readOnly;

  const save = () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(hidden)) fd.set(k, v);
    for (const f of fields) fd.set(f.name, values[f.name] ?? "");
    startTransition(() => formAction(fd));
  };

  const display = (f: FieldDef) => {
    const v = values[f.name] ?? "";
    if (!v) return <span className="text-muted-foreground">—</span>;
    if (f.kind === "select") return f.options?.find((o) => o.value === v)?.label ?? v;
    if (f.kind === "datetime") return v.replace("T", " ");
    return <span className="whitespace-pre-wrap">{v}</span>;
  };

  const control = (f: FieldDef, className?: string) => {
    const id = `field-${f.name}`;
    const errors = state.fieldErrors?.[f.name];
    const common = {
      id,
      name: f.name,
      "aria-invalid": errors?.length ? true : undefined,
      "aria-describedby": errors?.length ? `${id}-error` : undefined,
      required: f.required,
    } as const;
    const set = (v: string) => setValues((s) => ({ ...s, [f.name]: v }));
    const input =
      f.kind === "textarea" ? (
        <Textarea {...common} value={values[f.name] ?? ""} placeholder={f.placeholder} onChange={(e) => set(e.target.value)} />
      ) : f.kind === "select" ? (
        <Select {...common} className="w-full" value={values[f.name] ?? ""} onChange={(e) => set(e.target.value)}>
          {!f.required ? <option value="">Not set</option> : null}
          {f.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      ) : (
        <Input
          {...common}
          type={f.kind === "date" ? "date" : f.kind === "datetime" ? "datetime-local" : f.kind === "number" ? "number" : "text"}
          value={values[f.name] ?? ""}
          placeholder={f.placeholder}
          onChange={(e) => set(e.target.value)}
          className={className}
        />
      );
    return (
      <>
        {input}
        {errors?.length ? (
          <p id={`${id}-error`} className="text-sm text-destructive">
            {errors[0]}
          </p>
        ) : null}
      </>
    );
  };

  const row = (name: string) => {
    const f = byName.get(name);
    if (!f) return null;
    return (
      <div key={name} className="grid gap-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-start sm:gap-3">
        <label htmlFor={`field-${name}`} className="pt-1.5 text-sm text-muted-foreground">
          {f.label}
        </label>
        <div className="grid gap-1 text-sm">{editable(f) ? control(f) : <p className="pt-1.5">{display(f)}</p>}</div>
      </div>
    );
  };

  const title = titleField ? byName.get(titleField) : undefined;
  const activeTab = tabs.find((t) => t.key === tab);

  return (
    <div className="grid gap-4">
      {canEdit && dirty ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
          {mode === "create" && discardHref ? (
            <Link href={discardHref as never} className="rounded-md px-3 py-1.5 text-sm hover:bg-muted">
              Discard
            </Link>
          ) : (
            <Button type="button" variant="ghost" onClick={() => setValues(saved)} disabled={pending}>
              Discard
            </Button>
          )}
          <FormMessage state={state} />
        </div>
      ) : state.message ? (
        <FormMessage state={state} />
      ) : null}

      {title ? (
        <div className="grid gap-1">
          <label htmlFor={`field-${title.name}`} className="sr-only">
            {title.label}
          </label>
          {editable(title) ? (
            control(title, "h-10 text-xl font-semibold")
          ) : (
            <h1 className="text-xl font-semibold">{values[title.name]}</h1>
          )}
        </div>
      ) : null}

      <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
        {groups.map((g, i) => (
          <div key={i} className="grid content-start gap-3">
            {g.map(row)}
          </div>
        ))}
      </div>

      {tabs.length ? (
        <div className="grid gap-3">
          <div role="tablist" aria-label="Sections" className="flex gap-1 border-b border-border">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                id={`tab-${t.key}`}
                aria-selected={t.key === tab}
                aria-controls={`panel-${t.key}`}
                onClick={() => setTab(t.key)}
                className={cn(
                  "-mb-px border-b-2 px-3 py-1.5 text-sm",
                  t.key === tab ? "border-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          {activeTab ? (
            <div role="tabpanel" id={`panel-${activeTab.key}`} aria-labelledby={`tab-${activeTab.key}`} className="grid gap-3">
              {activeTab.fields?.map(row)}
              {activeTab.content}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
