"use client";

import { useState, useTransition, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/auth/action-state";
import { CHOICE_TYPES, QUESTION_TYPE_LABELS, QUESTION_TYPES, SCORED_TYPES, type QuestionType } from "@/lib/instruments/question-types";
import { cn } from "@/lib/utils";

type Act = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export type BuilderDimension = { id: string; name: string; weight: number };
export type BuilderQuestion = {
  id: string;
  sectionId: string;
  dimensionId: string | null;
  text: string;
  helpText: string | null;
  type: QuestionType;
  weight: number;
  isRequired: boolean;
  isReverseScored: boolean;
  source: string | null;
  options: { label: string; value: number }[];
};
export type BuilderSection = { id: string; title: string; description: string | null; questions: BuilderQuestion[] };

export type BuilderActions = { saveDimension: Act; saveSection: Act; saveQuestion: Act; deleteChild: Act; reorder: Act };

type Errors = Record<string, string[] | undefined>;

const idle: ActionState = { ok: false };
const err = (errors: Errors | undefined, key: string) =>
  errors?.[key]?.length ? <p className="text-sm text-destructive">{errors[key]![0]}</p> : null;

/**
 * The instrument builder (phase 03 step 5): the one bespoke screen, because the view kit cannot
 * express drag-ordered nested sections. Every write is a server action; ordering is applied
 * locally first and rolled back if the server refuses. When `editable` is false (not a draft, or
 * read-only access) it shows the same content with no controls.
 */
export function InstrumentBuilder({
  instrumentId,
  editable,
  dimensions: initialDimensions,
  sections: initialSections,
  actions,
}: {
  instrumentId: string;
  editable: boolean;
  dimensions: BuilderDimension[];
  sections: BuilderSection[];
  actions: BuilderActions;
}) {
  const [dims, setDims] = useState(initialDimensions);
  const [secs, setSecs] = useState(initialSections);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [drag, setDrag] = useState<string | null>(null);

  /** Calls an action with the instrument id and the given fields; reports a refusal at the top. */
  const call = async (action: Act, fields: Record<string, string>) => {
    const fd = new FormData();
    fd.set("instrumentId", instrumentId);
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    const result = await action(idle, fd);
    setMessage(result.ok ? null : (result.message ?? null));
    return result;
  };

  const persistOrder = (kind: "dimension" | "section" | "question", ids: string[], rollback: () => void, sectionId?: string) =>
    startTransition(async () => {
      const result = await call(actions.reorder, { kind, ids: ids.join(","), ...(sectionId ? { sectionId } : {}) });
      if (!result.ok) {
        rollback();
        setMessage(result.message ?? "That order could not be saved.");
      }
    });

  const swap = <T,>(list: T[], i: number, j: number) => {
    const next = [...list];
    [next[i], next[j]] = [next[j]!, next[i]!];
    return next;
  };

  const moveDimension = (i: number, j: number) => {
    const before = dims;
    const next = swap(dims, i, j);
    setDims(next);
    persistOrder("dimension", next.map((d) => d.id), () => setDims(before));
  };

  const moveSection = (i: number, j: number) => {
    const before = secs;
    const next = swap(secs, i, j);
    setSecs(next);
    persistOrder("section", next.map((s) => s.id), () => setSecs(before));
  };

  /** Moves a question before `beforeId` in `toSection` (or to its end), across sections if need be. */
  const moveQuestion = (questionId: string, toSection: string, beforeId: string | null) => {
    if (questionId === beforeId) return;
    const before = secs;
    const moved = secs.flatMap((s) => s.questions).find((q) => q.id === questionId);
    if (!moved) return;
    const without = secs.map((s) => ({ ...s, questions: s.questions.filter((q) => q.id !== questionId) }));
    const next = without.map((s) => {
      if (s.id !== toSection) return s;
      const qs = [...s.questions];
      const at = beforeId ? qs.findIndex((q) => q.id === beforeId) : -1;
      qs.splice(at < 0 ? qs.length : at, 0, { ...moved, sectionId: toSection });
      return { ...s, questions: qs };
    });
    setSecs(next);
    persistOrder("question", next.find((s) => s.id === toSection)!.questions.map((q) => q.id), () => setSecs(before), toSection);
  };

  const onDrop = (e: DragEvent, sectionId: string, beforeId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    const id = e.dataTransfer.getData("text/plain") || drag;
    setDrag(null);
    if (id) moveQuestion(id, sectionId, beforeId);
  };

  let n = 0;
  const usage = (dimensionId: string) => secs.reduce((c, s) => c + s.questions.filter((q) => q.dimensionId === dimensionId).length, 0);

  return (
    <div className="grid gap-6" aria-busy={pending || undefined}>
      {message ? (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ) : null}

      <section id="dimensions" aria-labelledby="dimensions-heading" className="grid gap-3 rounded-md border border-border bg-card p-4">
        <div className="grid gap-1">
          <h2 id="dimensions-heading" className="text-base font-semibold">
            Dimensions
          </h2>
          <p className="text-sm text-muted-foreground">
            Each scored question counts towards one dimension. A dimension&apos;s weight sets its share of the overall score.
          </p>
        </div>
        <ul className="grid gap-2">
          {dims.map((d, i) => (
            <li key={d.id} className="border-b border-border pb-2 last:border-b-0">
              <DimensionRow
                dimension={d}
                index={i}
                used={usage(d.id)}
                editable={editable}
                onSave={(fields) => call(actions.saveDimension, { dimensionId: d.id, ...fields })}
                onDelete={() => call(actions.deleteChild, { kind: "dimension", id: d.id })}
                onUp={i > 0 ? () => moveDimension(i, i - 1) : undefined}
                onDown={i < dims.length - 1 ? () => moveDimension(i, i + 1) : undefined}
              />
            </li>
          ))}
        </ul>
        {dims.length === 0 ? <p className="text-sm text-muted-foreground">No dimensions yet. Scored questions need one.</p> : null}
        {editable ? <NewDimension onSave={(fields) => call(actions.saveDimension, fields)} /> : null}
      </section>

      {secs.map((s, si) => (
        <section
          key={s.id}
          aria-label={`Section ${si + 1}: ${s.title}`}
          data-section-id={s.id}
          className="grid gap-3 rounded-md border border-border bg-card p-4"
          onDragOver={(e) => (drag ? e.preventDefault() : undefined)}
          onDrop={(e) => onDrop(e, s.id, null)}
        >
          <SectionHeader
            section={s}
            index={si}
            editable={editable}
            onSave={(fields) => call(actions.saveSection, { sectionId: s.id, ...fields })}
            onDelete={() => call(actions.deleteChild, { kind: "section", id: s.id })}
            onUp={si > 0 ? () => moveSection(si, si - 1) : undefined}
            onDown={si < secs.length - 1 ? () => moveSection(si, si + 1) : undefined}
          />
          <ol className="grid">
            {s.questions.map((q, qi) => {
              n += 1;
              return (
                <li
                  key={q.id}
                  data-question-id={q.id}
                  draggable={editable}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", q.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDrag(q.id);
                  }}
                  onDragEnd={() => setDrag(null)}
                  onDragOver={(e) => (drag ? e.preventDefault() : undefined)}
                  onDrop={(e) => onDrop(e, s.id, q.id)}
                  className={cn("border-t border-border py-3", drag === q.id && "opacity-50", editable && "cursor-grab")}
                >
                  <QuestionRow
                    question={q}
                    number={n}
                    dimensions={dims}
                    sections={secs}
                    editable={editable}
                    onSave={(fields) => call(actions.saveQuestion, { questionId: q.id, ...fields })}
                    onDelete={() => call(actions.deleteChild, { kind: "question", id: q.id })}
                    onUp={qi > 0 ? () => moveQuestion(q.id, s.id, s.questions[qi - 1]!.id) : undefined}
                    onDown={qi < s.questions.length - 1 ? () => moveQuestion(q.id, s.id, s.questions[qi + 2]?.id ?? null) : undefined}
                  />
                </li>
              );
            })}
          </ol>
          {s.questions.length === 0 ? <p className="text-sm text-muted-foreground">No questions in this section.</p> : null}
          {editable ? <NewQuestion sectionId={s.id} dimensions={dims} sections={secs} onSave={(fields) => call(actions.saveQuestion, fields)} /> : null}
        </section>
      ))}

      {editable ? <NewSection onSave={(fields) => call(actions.saveSection, fields)} /> : null}
    </div>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────────────────────

type Save = (fields: Record<string, string>) => Promise<ActionState>;

function OrderButtons({ label, onUp, onDown }: { label: string; onUp?: () => void; onDown?: () => void }) {
  return (
    <>
      <Button type="button" variant="ghost" size="sm" aria-label={`Move ${label} up`} disabled={!onUp} onClick={onUp}>
        Up
      </Button>
      <Button type="button" variant="ghost" size="sm" aria-label={`Move ${label} down`} disabled={!onDown} onClick={onDown}>
        Down
      </Button>
    </>
  );
}

/** Runs a save and keeps its field errors; `onOk` runs on success. */
function useSave(save: Save, onOk?: () => void) {
  const [errors, setErrors] = useState<Errors | undefined>();
  const [pending, startTransition] = useTransition();
  const run = (fields: Record<string, string>) =>
    startTransition(async () => {
      const result = await save(fields);
      setErrors(result.ok ? undefined : result.fieldErrors);
      if (result.ok) onOk?.();
    });
  return { errors, pending, run };
}

function DimensionRow({
  dimension: d,
  index,
  used,
  editable,
  onSave,
  onDelete,
  onUp,
  onDown,
}: {
  dimension: BuilderDimension;
  index: number;
  used: number;
  editable: boolean;
  onSave: Save;
  onDelete: Save;
  onUp?: () => void;
  onDown?: () => void;
}) {
  const [name, setName] = useState(d.name);
  const [weight, setWeight] = useState(String(d.weight));
  const { errors, pending, run } = useSave(onSave);
  const del = useSave(onDelete);
  const dirty = name !== d.name || weight !== String(d.weight);
  const count = `${used} ${used === 1 ? "question" : "questions"}`;

  if (!editable) {
    return (
      <p className="flex flex-wrap gap-x-3 text-sm">
        <span className="font-semibold">{d.name}</span>
        <span className="text-muted-foreground">weight {d.weight}</span>
        <span className="text-muted-foreground">{count}</span>
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="grid min-w-40 flex-1 gap-1">
        <label htmlFor={`dim-${d.id}-name`} className="text-sm text-muted-foreground">
          Dimension {index + 1}
        </label>
        <Input id={`dim-${d.id}-name`} value={name} onChange={(e) => setName(e.target.value)} />
        {err(errors, "name")}
      </div>
      <div className="grid w-24 gap-1">
        <label htmlFor={`dim-${d.id}-weight`} className="text-sm text-muted-foreground">
          Weight
        </label>
        <Input id={`dim-${d.id}-weight`} type="number" step="0.1" min="0.1" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
        {err(errors, "weight")}
      </div>
      <span className="pb-2 text-sm text-muted-foreground tabular-nums">{count}</span>
      <div className="flex flex-wrap items-center gap-1">
        {dirty ? (
          <Button type="button" size="sm" disabled={pending} onClick={() => run({ name, weight })}>
            {pending ? "Saving…" : "Save"}
          </Button>
        ) : null}
        <OrderButtons label={`dimension ${d.name}`} onUp={onUp} onDown={onDown} />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Delete dimension ${d.name}`}
          disabled={del.pending}
          onClick={() => confirm(`Delete the dimension "${d.name}"?`) && del.run({})}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

function NewDimension({ onSave }: { onSave: Save }) {
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("1");
  const { errors, pending, run } = useSave(onSave, () => {
    setName("");
    setWeight("1");
  });
  return (
    <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
      <div className="grid min-w-40 flex-1 gap-1">
        <label htmlFor="new-dimension-name" className="text-sm text-muted-foreground">
          New dimension
        </label>
        <Input id="new-dimension-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Personal impact" />
        {err(errors, "name")}
      </div>
      <div className="grid w-24 gap-1">
        <label htmlFor="new-dimension-weight" className="text-sm text-muted-foreground">
          Weight
        </label>
        <Input id="new-dimension-weight" type="number" step="0.1" min="0.1" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
        {err(errors, "weight")}
      </div>
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => run({ name, weight })}>
        {pending ? "Adding…" : "Add dimension"}
      </Button>
    </div>
  );
}

function SectionFields({
  initial,
  submitLabel,
  onSave,
  onCancel,
  idPrefix,
}: {
  initial: { title: string; description: string };
  submitLabel: string;
  onSave: Save;
  onCancel?: () => void;
  idPrefix: string;
}) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const { errors, pending, run } = useSave(onSave, () => {
    setTitle(initial.title);
    setDescription(initial.description);
    onCancel?.();
  });
  return (
    <div className="grid gap-2">
      <div className="grid gap-1">
        <label htmlFor={`${idPrefix}-title`} className="text-sm text-muted-foreground">
          Section title
        </label>
        <Input id={`${idPrefix}-title`} value={title} onChange={(e) => setTitle(e.target.value)} />
        {err(errors, "title")}
      </div>
      <div className="grid gap-1">
        <label htmlFor={`${idPrefix}-description`} className="text-sm text-muted-foreground">
          Section introduction
        </label>
        <Textarea id={`${idPrefix}-description`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional. Shown above the section's questions." />
        {err(errors, "description")}
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={() => run({ title, description })}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function SectionHeader({
  section: s,
  index,
  editable,
  onSave,
  onDelete,
  onUp,
  onDown,
}: {
  section: BuilderSection;
  index: number;
  editable: boolean;
  onSave: Save;
  onDelete: Save;
  onUp?: () => void;
  onDown?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const del = useSave(onDelete);
  if (editing) {
    return (
      <SectionFields
        idPrefix={`section-${s.id}`}
        initial={{ title: s.title, description: s.description ?? "" }}
        submitLabel="Save section"
        onSave={onSave}
        onCancel={() => setEditing(false)}
      />
    );
  }
  return (
    <div className="flex flex-wrap items-start gap-2">
      <div className="grid flex-1 gap-1">
        <h2 className="text-base font-semibold">
          <span className="text-muted-foreground">{index + 1}.</span> {s.title}
        </h2>
        {s.description ? <p className="text-sm text-muted-foreground">{s.description}</p> : null}
      </div>
      {editable ? (
        <div className="flex flex-wrap gap-1">
          <Button type="button" variant="ghost" size="sm" aria-label={`Edit section ${s.title}`} onClick={() => setEditing(true)}>
            Edit
          </Button>
          <OrderButtons label={`section ${s.title}`} onUp={onUp} onDown={onDown} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Delete section ${s.title}`}
            disabled={del.pending}
            onClick={() =>
              confirm(s.questions.length ? `Delete "${s.title}" and its ${s.questions.length} questions?` : `Delete "${s.title}"?`) && del.run({})
            }
          >
            Delete
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function NewSection({ onSave }: { onSave: Save }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          Add section
        </Button>
      </div>
    );
  }
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <SectionFields idPrefix="new-section" initial={{ title: "", description: "" }} submitLabel="Add section" onSave={onSave} onCancel={() => setOpen(false)} />
    </div>
  );
}

function QuestionRow({
  question: q,
  number,
  dimensions,
  sections,
  editable,
  onSave,
  onDelete,
  onUp,
  onDown,
}: {
  question: BuilderQuestion;
  number: number;
  dimensions: BuilderDimension[];
  sections: BuilderSection[];
  editable: boolean;
  onSave: Save;
  onDelete: Save;
  onUp?: () => void;
  onDown?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const del = useSave(onDelete);
  if (editing) {
    return <QuestionEditor question={q} sectionId={q.sectionId} dimensions={dimensions} sections={sections} onSave={onSave} onClose={() => setEditing(false)} />;
  }
  const dimension = dimensions.find((d) => d.id === q.dimensionId);
  const meta = [
    QUESTION_TYPE_LABELS[q.type],
    dimension ? dimension.name : "Not scored",
    dimension ? `weight ${q.weight}` : null,
    q.isReverseScored ? "reverse-scored" : null,
    q.isRequired ? null : "optional",
  ].filter(Boolean);
  return (
    <div className="flex flex-wrap items-start gap-2">
      <div className="grid min-w-0 flex-1 gap-1">
        <p className="text-sm">
          <span className="text-muted-foreground tabular-nums">{number}.</span> {q.text}
        </p>
        <p className="text-sm text-muted-foreground">{meta.join(" · ")}</p>
        {q.source ? <p className="text-sm text-muted-foreground">Source: {q.source}</p> : null}
      </div>
      {editable ? (
        <div className="flex flex-wrap gap-1">
          <Button type="button" variant="ghost" size="sm" aria-label={`Edit question ${number}`} onClick={() => setEditing(true)}>
            Edit
          </Button>
          <OrderButtons label={`question ${number}`} onUp={onUp} onDown={onDown} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Delete question ${number}`}
            disabled={del.pending}
            onClick={() => confirm("Delete this question?") && del.run({})}
          >
            Delete
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function NewQuestion({ sectionId, dimensions, sections, onSave }: { sectionId: string; dimensions: BuilderDimension[]; sections: BuilderSection[]; onSave: Save }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          Add question
        </Button>
      </div>
    );
  }
  return (
    <div className="border-t border-border pt-3">
      <QuestionEditor sectionId={sectionId} dimensions={dimensions} sections={sections} onSave={onSave} onClose={() => setOpen(false)} />
    </div>
  );
}

const defaultOptions = () => [
  { label: "", value: "1" },
  { label: "", value: "2" },
];

function QuestionEditor({
  question: q,
  sectionId: initialSection,
  dimensions,
  sections,
  onSave,
  onClose,
}: {
  question?: BuilderQuestion;
  sectionId: string;
  dimensions: BuilderDimension[];
  sections: BuilderSection[];
  onSave: Save;
  onClose: () => void;
}) {
  const key = q?.id ?? `new-${initialSection}`;
  const [text, setText] = useState(q?.text ?? "");
  const [helpText, setHelpText] = useState(q?.helpText ?? "");
  const [type, setType] = useState<QuestionType>(q?.type ?? "likert_5");
  const [sectionId, setSectionId] = useState(initialSection);
  const [dimensionId, setDimensionId] = useState(q?.dimensionId ?? dimensions[0]?.id ?? "");
  const [weight, setWeight] = useState(String(q?.weight ?? 1));
  const [isRequired, setRequired] = useState(q?.isRequired ?? true);
  const [isReverseScored, setReverse] = useState(q?.isReverseScored ?? false);
  const [options, setOptions] = useState(q?.options.length ? q.options.map((o) => ({ label: o.label, value: String(o.value) })) : defaultOptions());
  const { errors, pending, run } = useSave(onSave, onClose);

  const scored = SCORED_TYPES.includes(type);
  const choice = CHOICE_TYPES.includes(type);
  const id = (f: string) => `q-${key}-${f}`;
  const setOption = (i: number, patch: Partial<{ label: string; value: string }>) =>
    setOptions((os) => os.map((o, j) => (j === i ? { ...o, ...patch } : o)));

  const submit = () =>
    run({
      sectionId,
      dimensionId: scored ? dimensionId : "",
      text,
      helpText,
      type,
      weight,
      isRequired: String(isRequired),
      isReverseScored: String(scored && isReverseScored),
      options: JSON.stringify(choice ? options : []),
    });

  return (
    <div className="grid gap-3" aria-label={q ? "Edit question" : "New question"} role="group">
      <div className="grid gap-1">
        <label htmlFor={id("text")} className="text-sm text-muted-foreground">
          Question text
        </label>
        <Textarea id={id("text")} value={text} onChange={(e) => setText(e.target.value)} />
        {err(errors, "text")}
      </div>
      <div className="grid gap-1">
        <label htmlFor={id("help")} className="text-sm text-muted-foreground">
          Help text
        </label>
        <Input id={id("help")} value={helpText} onChange={(e) => setHelpText(e.target.value)} placeholder="Optional. Shown under the question." />
        {err(errors, "helpText")}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <label htmlFor={id("type")} className="text-sm text-muted-foreground">
            Type
          </label>
          <Select id={id("type")} className="w-full" value={type} onChange={(e) => setType(e.target.value as QuestionType)}>
            {QUESTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {QUESTION_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
          {err(errors, "type")}
        </div>
        <div className="grid gap-1">
          <label htmlFor={id("section")} className="text-sm text-muted-foreground">
            Section
          </label>
          <Select id={id("section")} className="w-full" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </Select>
          {err(errors, "sectionId")}
        </div>
        {scored ? (
          <>
            <div className="grid gap-1">
              <label htmlFor={id("dimension")} className="text-sm text-muted-foreground">
                Dimension
              </label>
              <Select id={id("dimension")} className="w-full" value={dimensionId} onChange={(e) => setDimensionId(e.target.value)}>
                {dimensions.length === 0 ? <option value="">Add a dimension first</option> : null}
                {dimensions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
              {err(errors, "dimensionId")}
            </div>
            <div className="grid gap-1">
              <label htmlFor={id("weight")} className="text-sm text-muted-foreground">
                Weight
              </label>
              <Input id={id("weight")} type="number" step="0.1" min="0.1" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
              {err(errors, "weight")}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground sm:col-span-2">Not scored: answers are reported as they are.</p>
        )}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isRequired} onChange={(e) => setRequired(e.target.checked)} />
          Required
        </label>
        {scored ? (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isReverseScored} onChange={(e) => setReverse(e.target.checked)} />
            Reverse-scored
          </label>
        ) : null}
      </div>
      {scored && isReverseScored ? (
        <p className="text-sm text-muted-foreground">Agreeing with this question counts against readiness, so its score is flipped.</p>
      ) : null}

      {choice ? (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm text-muted-foreground">Options, with the score each one carries</legend>
          {options.map((o, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <Input aria-label={`Option ${i + 1} label`} className="min-w-40 flex-1" value={o.label} onChange={(e) => setOption(i, { label: e.target.value })} />
              <Input
                aria-label={`Option ${i + 1} score`}
                type="number"
                inputMode="decimal"
                className="w-24"
                value={o.value}
                onChange={(e) => setOption(i, { value: e.target.value })}
              />
              <Button type="button" variant="ghost" size="sm" aria-label={`Remove option ${i + 1}`} onClick={() => setOptions((os) => os.filter((_, j) => j !== i))}>
                Remove
              </Button>
            </div>
          ))}
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => setOptions((os) => [...os, { label: "", value: String(os.length + 1) }])}>
              Add option
            </Button>
          </div>
          {err(errors, "options")}
        </fieldset>
      ) : null}

      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={submit}>
          {pending ? "Saving…" : q ? "Save question" : "Add question"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
