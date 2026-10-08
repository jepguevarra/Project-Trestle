"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { QuestionType } from "@/lib/instruments/question-types";
import { cn } from "@/lib/utils";

/**
 * Only what a respondent may see. Dimensions, weights, reverse scoring and item sources stay on the
 * server: the respondent path (phase 04) must not reveal how answers are scored.
 */
export type RespondentQuestion = {
  id: string;
  text: string;
  helpText: string | null;
  type: QuestionType;
  required: boolean;
  options: { id: string; label: string }[];
};
export type RespondentSection = { id: string; title: string; description: string | null; questions: RespondentQuestion[] };
export type Answers = Record<string, string | string[]>;

const LIKERT: Record<"likert_5" | "likert_7", string[]> = {
  likert_5: ["Strongly disagree", "Disagree", "Neither agree nor disagree", "Agree", "Strongly agree"],
  likert_7: ["Strongly disagree", "Disagree", "Somewhat disagree", "Neither agree nor disagree", "Somewhat agree", "Agree", "Strongly agree"],
};

const answered = (v: Answers[string] | undefined) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v.trim() !== "");

/** The first page holding a required question without an answer: where a returning respondent resumes. */
function resumePage(pages: RespondentSection[], answers: Answers) {
  const at = pages.findIndex((s) => s.questions.some((q) => q.required && !answered(answers[q.id])));
  return at < 0 ? Math.max(pages.length - 1, 0) : at;
}

/**
 * The survey as a respondent sees it, one section per page. The same component renders the
 * consultant's preview (`mode="preview"`: nothing is sent) and the live survey, where each page is
 * saved as the respondent moves on, so they can leave and come back. Save and submit return an
 * error sentence, or null on success.
 */
export function RespondentForm({
  title,
  intro,
  sections,
  mode,
  initialAnswers,
  onChange,
  onSave,
  onSubmit,
}: {
  title: string;
  intro?: string;
  sections: RespondentSection[];
  mode: "preview" | "live";
  initialAnswers?: Answers;
  onChange?: (answers: Answers) => void;
  onSave?: (answers: Answers) => Promise<string | null>;
  onSubmit?: (answers: Answers) => Promise<string | null>;
}) {
  const pages = sections.filter((s) => s.questions.length > 0);
  const [answers, setAnswers] = useState<Answers>(initialAnswers ?? {});
  const [page, setPage] = useState(() => (initialAnswers && Object.keys(initialAnswers).length ? resumePage(pages, initialAnswers) : 0));
  const [missing, setMissing] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!pages.length) return <p className="text-sm text-muted-foreground">There are no questions to show yet.</p>;
  if (done) {
    return (
      <div role="status" className="grid gap-2">
        <h1 className="text-xl font-semibold">Thank you</h1>
        <p className="text-sm text-muted-foreground">
          {mode === "preview" ? "Preview only: nothing was saved." : "Your answers have been recorded. You can close this page."}
        </p>
        {mode === "preview" ? (
          <div>
            <Button variant="outline" size="sm" onClick={() => (setDone(false), setPage(0), setAnswers({}))}>
              Start again
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  const section = pages[page]!;
  const last = page === pages.length - 1;
  const set = (id: string, v: string | string[]) => {
    const nextAnswers = { ...answers, [id]: v };
    setAnswers(nextAnswers);
    onChange?.(nextAnswers);
    setMissing((m) => m.filter((x) => x !== id));
  };
  // This page's answers, with unanswered questions sent empty so a cleared answer is cleared.
  const pageAnswers = () => Object.fromEntries(section.questions.map((q) => [q.id, answers[q.id] ?? ""]));

  const go = async (to: number) => {
    setError(null);
    if (onSave) {
      setBusy(true);
      const err = await onSave(pageAnswers());
      setBusy(false);
      if (err) return setError(err);
    }
    setPage(to);
    window.scrollTo({ top: 0 });
  };

  const next = async () => {
    const gaps = section.questions.filter((q) => q.required && !answered(answers[q.id])).map((q) => q.id);
    setMissing(gaps);
    if (gaps.length) {
      document.getElementById(`q-${gaps[0]}`)?.scrollIntoView({ block: "center" });
      return;
    }
    if (!last) return go(page + 1);
    setError(null);
    if (onSubmit) {
      setBusy(true);
      const err = await onSubmit(pageAnswers());
      setBusy(false);
      if (err) return setError(err);
    }
    setDone(true);
  };

  return (
    <div className="grid gap-6">
      <header className="grid gap-1">
        <h1 className="text-xl font-semibold">{title}</h1>
        {intro && page === 0 ? <p className="text-sm text-muted-foreground">{intro}</p> : null}
        <p className="text-sm text-muted-foreground">
          Section {page + 1} of {pages.length}
        </p>
      </header>

      <section aria-labelledby={`s-${section.id}`} className="grid gap-6">
        <div className="grid gap-1">
          <h2 id={`s-${section.id}`} className="text-base font-semibold">
            {section.title}
          </h2>
          {section.description ? <p className="text-sm text-muted-foreground">{section.description}</p> : null}
        </div>
        {section.questions.map((q) => (
          <QuestionField key={q.id} question={q} value={answers[q.id]} onChange={(v) => set(q.id, v)} missing={missing.includes(q.id)} />
        ))}
      </section>

      <div className="grid gap-2 border-t border-border pt-4">
        <div className="flex gap-2">
          {page > 0 ? (
            <Button type="button" variant="outline" className="h-11 flex-1 sm:flex-none" disabled={busy} onClick={() => go(page - 1)}>
              Back
            </Button>
          ) : null}
          <Button type="button" className="h-11 flex-1 sm:flex-none" disabled={busy} onClick={next}>
            {busy ? "Saving…" : last ? "Submit" : "Next"}
          </Button>
        </div>
        {missing.length ? (
          <p role="alert" className="text-sm text-destructive">
            {missing.length === 1 ? "One required question is unanswered." : `${missing.length} required questions are unanswered.`}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {mode === "live" && !last ? <p className="text-sm text-muted-foreground">Your answers are saved each time you move on. You can leave and come back with the same link.</p> : null}
      </div>
    </div>
  );
}

function QuestionField({
  question: q,
  value,
  onChange,
  missing,
}: {
  question: RespondentQuestion;
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
  missing: boolean;
}) {
  const id = `q-${q.id}`;
  const help = q.helpText ? <p className="text-sm text-muted-foreground">{q.helpText}</p> : null;
  const label = (
    <>
      {q.text}
      {q.required ? null : <span className="text-muted-foreground"> (optional)</span>}
    </>
  );
  const error = missing ? <p className="text-sm text-destructive">Answer this question to continue.</p> : null;

  if (q.type === "open_text" || q.type === "numeric") {
    return (
      <div id={id} className="grid gap-2" data-question-type={q.type}>
        <label htmlFor={`${id}-input`} className="text-sm font-semibold">
          {label}
        </label>
        {help}
        {q.type === "open_text" ? (
          <Textarea id={`${id}-input`} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} aria-invalid={missing || undefined} />
        ) : (
          <Input
            id={`${id}-input`}
            type="number"
            inputMode="decimal"
            className="max-w-40"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={missing || undefined}
          />
        )}
        {error}
      </div>
    );
  }

  const choices =
    q.type === "likert_5" || q.type === "likert_7" ? LIKERT[q.type].map((l, i) => ({ id: String(i + 1), label: l })) : q.options;
  const multi = q.type === "multi_choice";
  const selected = multi ? ((value as string[] | undefined) ?? []) : value;
  const isLikert = q.type === "likert_5" || q.type === "likert_7";

  return (
    <fieldset id={id} className="grid gap-2" data-question-type={q.type} aria-invalid={missing || undefined}>
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      {help}
      {multi ? <p className="text-sm text-muted-foreground">Choose all that apply.</p> : null}
      <div
        className={cn(
          "grid gap-1.5",
          isLikert && (q.type === "likert_5" ? "sm:grid-cols-5" : "sm:grid-cols-7"),
        )}
      >
        {choices.map((c) => {
          const checked = multi ? (selected as string[]).includes(c.id) : selected === c.id;
          return (
            <label
              key={c.id}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2 text-sm",
                isLikert && "sm:flex-col sm:justify-start sm:px-2 sm:text-center",
                checked && "border-primary",
              )}
            >
              <input
                type={multi ? "checkbox" : "radio"}
                name={id}
                value={c.id}
                checked={checked}
                onChange={() =>
                  onChange(
                    multi
                      ? checked
                        ? (selected as string[]).filter((x) => x !== c.id)
                        : [...(selected as string[]), c.id]
                      : c.id,
                  )
                }
              />
              <span>{c.label}</span>
            </label>
          );
        })}
      </div>
      {error}
    </fieldset>
  );
}
