import { eq, sql } from "drizzle-orm";
import type { InstrumentDefinition } from "../instruments/definition";
import { createInstrumentFromDefinition } from "./mutations/instruments";
import { saveDrafts, submitSurvey } from "./mutations/survey";
import type { Db } from "./rls";
import { instrument, question, respondent } from "./schema";
import { withSurveyOn } from "./survey-role";
import type { Seniority } from "../views/respondent";

export const BASELINE_NAME = "Baseline readiness";

/** A small deterministic random generator, so every fresh seed produces the same answers. */
function generator(seed: number) {
  let a = seed;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // Roughly normal: the sum of three uniforms, centred.
  return { next, normal: () => next() + next() + next() - 1.5 };
}

// Thirty-four people at Harbour Foods. Purchasing has four, so its breakdown is suppressed; the
// leadership and frontline groups both clear five, so the perception gap shows.
const PEOPLE: [department: string, roleTitle: string, seniority: Seniority, count: number][] = [
  ["Finance", "AP clerk", "frontline", 4],
  ["Finance", "Accountant", "frontline", 2],
  ["Finance", "Finance manager", "manager", 2],
  ["Warehouse", "Picker", "frontline", 5],
  ["Warehouse", "Stores lead", "supervisor", 3],
  ["Warehouse", "Warehouse manager", "manager", 2],
  ["Sales", "Sales coordinator", "frontline", 4],
  ["Sales", "Sales director", "executive", 2],
  ["Operations", "Planner", "frontline", 3],
  ["Operations", "Operations director", "executive", 3],
  ["Purchasing", "Buyer", "frontline", 3],
  ["Purchasing", "Purchasing manager", "manager", 1],
];

// How each group tends to feel, as a shift on the 1-5 scale. Warehouse staff are the least ready,
// leaders the most, and everyone doubts they will have the time (resources).
const DEPARTMENT_SHIFT: Record<string, number> = { Finance: 0.3, Warehouse: -0.8, Sales: 0, Operations: 0.1, Purchasing: -0.2 };
const SENIORITY_SHIFT: Record<Seniority, number> = { frontline: -0.2, supervisor: 0, manager: 0.6, executive: 0.9 };
const DIMENSION_SHIFT: Record<string, number> = { Resources: -0.7, Communication: -0.3, Leadership: 0.2 };

const CONCERNS = [
  "Month-end close while we are still learning the new system.",
  "Nobody has told us when the training is.",
  "Picking will be slower at first and the trucks still leave at six.",
  "We have been promised new systems before and nothing changed.",
  "I am worried the reports finance relies on will not be ready.",
  "Too many changes at once this year.",
  "Not sure who to ask when something goes wrong.",
];
const HELPS = [
  "Time to practise before go-live, away from the floor.",
  "A named person in each team to go to with questions.",
  "Clear dates, and sticking to them.",
  "Seeing the new screens early.",
  "Cover for my normal work during training.",
];

/**
 * The closed baseline on the Odoo rollout: thirty-four people invited, thirty submitted through the
 * real survey path (drafts, then private.submit_survey as the survey role), so the anonymity
 * mechanism, the segment copies and the durations are exactly what a live survey produces. One
 * person straight-lines and one rushes, so the quality panel has something to show.
 */
export async function seedBaseline(
  db: Db,
  opts: { orgId: string; engagementId: string; templateId: string; createdBy: string; definition: InstrumentDefinition },
) {
  const scope = { orgId: opts.orgId, engagementId: opts.engagementId };
  const inst = await db.transaction((tx) =>
    createInstrumentFromDefinition(tx, scope, { name: BASELINE_NAME, kind: "readiness", templateId: opts.templateId, createdBy: opts.createdBy, wave: 1, waveLabel: "Baseline" }, opts.definition),
  );
  const invitedAt = new Date(Date.now() - 21 * 86400_000);
  await db.update(instrument).set({ status: "open", anonymity: "anonymous", opensAt: invitedAt }).where(eq(instrument.id, inst.id));

  const people = PEOPLE.flatMap(([department, roleTitle, seniority, count]) =>
    Array.from({ length: count }, (_, i) => ({ department, roleTitle, seniority, email: `${roleTitle.toLowerCase().replace(/\s+/g, ".")}.${i + 1}@harbourfoods.test` })),
  );
  const rows = await db
    .insert(respondent)
    .values(people.map((p) => ({ ...scope, instrumentId: inst.id, ...p, invitedAt })))
    .returning();

  const qs = await db
    .select({ id: question.id, type: question.type, reverse: question.isReverseScored, text: question.text, dimensionId: question.dimensionId })
    .from(question)
    .where(eq(question.instrumentId, inst.id));
  const dimName = new Map<string, string>();
  for (const d of await db.execute<{ id: string; name: string }>(sql`select id, name from dimension where instrument_id = ${inst.id}`)) dimName.set(d.id, d.name);

  const rand = generator(20261012);
  // Four people never answer: one in each of Finance, Warehouse, Sales and Operations.
  const skip = new Set([rows[1]!.id, rows[8]!.id, rows[16]!.id, rows[23]!.id]);
  const straightLiner = rows[5]!.id;
  const speeder = rows[12]!.id;

  for (const r of rows) {
    if (skip.has(r.id)) continue;
    const answers = qs.map((q) => {
      if (q.type === "open_text") {
        const pool = q.text.toLowerCase().includes("help") ? HELPS : CONCERNS;
        const text = rand.next() < 0.6 ? pool[Math.floor(rand.next() * pool.length)]! : null;
        return { questionId: q.id, valueNumeric: null, valueText: text, optionIds: null };
      }
      if (r.id === straightLiner) return { questionId: q.id, valueNumeric: 4, valueText: null, optionIds: null };
      const shift = DEPARTMENT_SHIFT[r.department ?? ""]! + SENIORITY_SHIFT[r.seniority!] + (DIMENSION_SHIFT[(dimName.get(q.dimensionId ?? "") ?? "").split(" ")[0]!] ?? 0);
      const felt = Math.min(5, Math.max(1, Math.round(3.3 + shift + rand.normal() * 1.4)));
      // A reverse-worded statement is agreed with when readiness is low.
      return { questionId: q.id, valueNumeric: q.reverse ? 6 - felt : felt, valueText: null, optionIds: null };
    });
    const startedAgo = r.id === speeder ? 60 : 300 + Math.floor(rand.next() * 900);
    await withSurveyOn(db, { respondentId: r.id, instrumentId: inst.id }, async (tx) => {
      await saveDrafts(tx, { ...scope, instrumentId: inst.id, respondentId: r.id }, answers.filter((a) => a.valueNumeric !== null || a.valueText !== null), []);
      await tx.execute(sql`update public.response_draft set created_at = now() - make_interval(secs => ${startedAgo})`);
      await submitSurvey(tx);
    });
  }

  await db.update(instrument).set({ status: "closed", closesAt: new Date() }).where(eq(instrument.id, inst.id));
  return inst.id;
}
