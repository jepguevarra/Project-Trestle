import type { QuestionType } from "@/lib/instruments/question-types";

/**
 * What the respondent page sends: question id → value. Agreement scales send "1".."5" (or 7),
 * single choice an option id, multiple choice option ids, open text and numbers a string.
 */
export type RawAnswers = Record<string, string | string[]>;

export type SurveyQuestion = { id: string; type: QuestionType; options: { id: string }[] };
export type DraftAnswer = { questionId: string; valueNumeric: number | null; valueText: string | null; optionIds: string[] | null };

export const MAX_TEXT = 5000;

/**
 * Checks raw answers against the instrument's own questions. Anything that does not fit (an unknown
 * question, an option from another question, a scale value out of range) rejects the whole save:
 * the page never sends such a thing, so it is a forged or stale request, not a typo.
 */
export function normaliseAnswers(questions: SurveyQuestion[], raw: RawAnswers):
  | { ok: true; answers: DraftAnswer[]; cleared: string[] }
  | { ok: false } {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const answers: DraftAnswer[] = [];
  const cleared: string[] = [];

  for (const [id, value] of Object.entries(raw)) {
    const q = byId.get(id);
    if (!q) return { ok: false };
    const empty = Array.isArray(value) ? value.length === 0 : value.trim() === "";
    if (empty) {
      cleared.push(id);
      continue;
    }
    const base = { questionId: id, valueNumeric: null, valueText: null, optionIds: null };
    const ids = new Set(q.options.map((o) => o.id));
    switch (q.type) {
      case "likert_5":
      case "likert_7": {
        const max = q.type === "likert_5" ? 5 : 7;
        const n = typeof value === "string" && /^\d$/.test(value) ? Number(value) : NaN;
        if (!(n >= 1 && n <= max)) return { ok: false };
        answers.push({ ...base, valueNumeric: n });
        break;
      }
      case "numeric": {
        const n = typeof value === "string" ? Number(value.trim()) : NaN;
        if (!Number.isFinite(n) || Math.abs(n) > 1e9) return { ok: false };
        answers.push({ ...base, valueNumeric: n });
        break;
      }
      case "open_text":
        if (typeof value !== "string" || value.length > MAX_TEXT) return { ok: false };
        answers.push({ ...base, valueText: value });
        break;
      case "single_choice":
        if (typeof value !== "string" || !ids.has(value)) return { ok: false };
        answers.push({ ...base, optionIds: [value] });
        break;
      case "multi_choice": {
        const list = [...new Set(Array.isArray(value) ? value : [value])];
        if (!list.every((v) => ids.has(v))) return { ok: false };
        answers.push({ ...base, optionIds: list });
        break;
      }
    }
  }
  return { ok: true, answers, cleared };
}

/** Saved drafts back into the page's shape, so a returning respondent sees their answers. */
export function draftsToRaw(questions: SurveyQuestion[], drafts: DraftAnswer[]): RawAnswers {
  const types = new Map(questions.map((q) => [q.id, q.type]));
  const out: RawAnswers = {};
  for (const d of drafts) {
    const type = types.get(d.questionId);
    if (!type) continue;
    if (type === "multi_choice") out[d.questionId] = d.optionIds ?? [];
    else if (type === "single_choice") out[d.questionId] = d.optionIds?.[0] ?? "";
    else if (type === "open_text") out[d.questionId] = d.valueText ?? "";
    else out[d.questionId] = d.valueNumeric === null ? "" : String(d.valueNumeric);
  }
  return out;
}
