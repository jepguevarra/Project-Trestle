import { SENIORITIES, SENIORITY_LABELS, type Seniority } from "@/lib/views/respondent";

/** One respondent as typed or pasted. Email is lower-cased; blanks are null. */
export type RespondentInput = { name: string | null; email: string; department: string | null; roleTitle: string | null; seniority: Seniority | null };

export const MAX_IMPORT = 2000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Splits one line of CSV (quotes allowed) or tab-separated text (pasted from a spreadsheet). */
function splitLine(line: string, delimiter: string): string[] {
  if (delimiter === "\t") return line.split("\t");
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

const HEADERS: Record<string, keyof RespondentInput> = {
  name: "name",
  "full name": "name",
  email: "email",
  "email address": "email",
  "e-mail": "email",
  department: "department",
  dept: "department",
  role: "roleTitle",
  "role title": "roleTitle",
  "job title": "roleTitle",
  title: "roleTitle",
  seniority: "seniority",
  level: "seniority",
};
const DEFAULT_ORDER: (keyof RespondentInput)[] = ["name", "email", "department", "roleTitle", "seniority"];

export function parseSeniority(v: string): Seniority | null | undefined {
  const s = v.trim().toLowerCase();
  if (!s) return null;
  return SENIORITIES.find((k) => k === s || SENIORITY_LABELS[k].toLowerCase() === s);
}

/**
 * Reads a pasted or uploaded list: CSV or tab-separated, with or without a header row. Without a
 * header the columns are name, email, department, role, seniority. Every problem is reported with
 * its line number; nothing is imported unless every line is valid, and duplicate emails (within the
 * list or already on the instrument) are reported, never merged.
 */
export function parseRespondentList(text: string, existing: Set<string>): { ok: true; rows: RespondentInput[] } | { ok: false; errors: string[] } {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").map((l, i) => ({ n: i + 1, l })).filter(({ l }) => l.trim() !== "");
  if (!lines.length) return { ok: false, errors: ["Paste at least one row."] };
  const delimiter = lines.some(({ l }) => l.includes("\t")) ? "\t" : lines.some(({ l }) => l.includes(";")) && !lines.some(({ l }) => l.includes(",")) ? ";" : ",";

  const first = splitLine(lines[0]!.l, delimiter).map((h) => h.trim().toLowerCase());
  const hasHeader = first.some((h) => HEADERS[h] === "email");
  const order = hasHeader ? first.map((h) => HEADERS[h]) : DEFAULT_ORDER;
  const body = hasHeader ? lines.slice(1) : lines;
  if (body.length > MAX_IMPORT) return { ok: false, errors: [`Import at most ${MAX_IMPORT} people at a time.`] };

  const errors: string[] = [];
  const rows: RespondentInput[] = [];
  const seen = new Map<string, number>();
  for (const { n, l } of body) {
    const cells = splitLine(l, delimiter).map((c) => c.trim());
    const get = (k: keyof RespondentInput) => {
      const i = order.indexOf(k);
      return i >= 0 ? (cells[i] ?? "") : "";
    };
    const email = get("email").toLowerCase();
    const seniority = parseSeniority(get("seniority"));
    if (!EMAIL.test(email)) errors.push(`Line ${n}: "${get("email")}" is not an email address.`);
    else if (seen.has(email)) errors.push(`Line ${n}: ${email} is already on line ${seen.get(email)}.`);
    else if (existing.has(email)) errors.push(`Line ${n}: ${email} is already a respondent on this survey.`);
    if (seniority === undefined) errors.push(`Line ${n}: seniority "${get("seniority")}" must be Frontline, Supervisor, Manager or Executive.`);
    seen.set(email, seen.get(email) ?? n);
    const text = (v: string, max: number) => (v ? v.slice(0, max) : null);
    rows.push({ name: text(get("name"), 120), email, department: text(get("department"), 120), roleTitle: text(get("roleTitle"), 120), seniority: seniority ?? null });
  }
  return errors.length ? { ok: false, errors: errors.slice(0, 20).concat(errors.length > 20 ? [`…and ${errors.length - 20} more.`] : []) } : { ok: true, rows };
}
