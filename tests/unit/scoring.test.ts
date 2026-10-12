import { describe, expect, it } from "vitest";
import { perceptionGap } from "@/lib/scoring/gap";
import { itemScore, scoreMatrix } from "@/lib/scoring/normalise";
import { qualityFlags } from "@/lib/scoring/quality";
import { dimensionResult, itemResults, lowestItems, readinessIndex, submissionDimensionScore } from "@/lib/scoring/readiness";
import { cronbachAlpha, dimensionReliability } from "@/lib/scoring/reliability";
import { buildReport } from "@/lib/scoring/report";
import { applyFilter, guard, MIN_SEGMENT } from "@/lib/scoring/segments";
import { mean, pearson, sd, variance, weightedMean } from "@/lib/scoring/stats";
import type { Answer, ScoredDimension, ScoredQuestion, Submission } from "@/lib/scoring/types";

const likert = (id: string, dimensionId: string, opts: Partial<ScoredQuestion> = {}): ScoredQuestion => ({
  id,
  text: `Question ${id}`,
  type: "likert_5",
  dimensionId,
  weight: 1,
  reverse: false,
  options: [],
  ...opts,
});
const sub = (id: string, opts: Partial<Submission> = {}): Submission => ({ id, department: null, roleTitle: null, seniority: null, durationSeconds: 300, ...opts });
const ans = (submissionId: string, questionId: string, v: number): Answer => ({ submissionId, questionId, optionId: null, valueNumeric: v });

const lead: ScoredDimension = { id: "lead", name: "Leadership", weight: 1 };
const comm: ScoredDimension = { id: "comm", name: "Communication", weight: 1 };

describe("stats", () => {
  it("mean, weighted mean, sample variance and sd, pearson", () => {
    expect(mean([])).toBeNull();
    expect(mean([1, 2, 3])).toBe(2);
    expect(weightedMean([{ value: 10, weight: 1 }, { value: 40, weight: 2 }])).toBe(30);
    expect(weightedMean([])).toBeNull();
    expect(variance([5])).toBeNull();
    expect(variance([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(4.571428, 5);
    expect(sd([1, 1])).toBe(0);
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
    expect(pearson([1, 2, 3], [5, 5, 5])).toBeNull();
    expect(pearson([1, 2], [1, 2])).toBeNull();
  });
});

describe("item normalisation", () => {
  it("maps agreement scales to 0–100 and reverses reverse-scored items", () => {
    expect(itemScore(likert("a", "lead"), [ans("s", "a", 1)])).toBe(0);
    expect(itemScore(likert("a", "lead"), [ans("s", "a", 4)])).toBe(75);
    expect(itemScore(likert("a", "lead", { reverse: true }), [ans("s", "a", 4)])).toBe(25);
    expect(itemScore(likert("a", "lead", { type: "likert_7" }), [ans("s", "a", 7)])).toBe(100);
    expect(itemScore(likert("a", "lead", { type: "likert_7" }), [ans("s", "a", 3)])).toBeCloseTo(33.333, 3);
  });

  it("excludes rather than zeroes: unanswered, out of range, or not scorable", () => {
    expect(itemScore(likert("a", "lead"), [])).toBeNull();
    expect(itemScore(likert("a", "lead"), [ans("s", "a", 6)])).toBeNull();
    expect(itemScore(likert("a", null as unknown as string), [ans("s", "a", 3)])).toBeNull();
    expect(itemScore({ ...likert("t", "lead"), type: "open_text" }, [ans("s", "t", 1)])).toBeNull();
  });

  it("scores choice questions between their lowest and highest option, averaging multiple choice", () => {
    const options = [
      { id: "x", value: 1 },
      { id: "y", value: 3 },
      { id: "z", value: 5 },
    ];
    const single = likert("c", "lead", { type: "single_choice", options });
    const multi = likert("m", "lead", { type: "multi_choice", options });
    const opt = (q: string, o: string): Answer => ({ submissionId: "s", questionId: q, optionId: o, valueNumeric: null });
    expect(itemScore(single, [opt("c", "y")])).toBe(50);
    expect(itemScore({ ...single, reverse: true }, [opt("c", "z")])).toBe(0);
    expect(itemScore(multi, [opt("m", "x"), opt("m", "z")])).toBe(50);
    expect(itemScore({ ...single, options: [{ id: "x", value: 2 }, { id: "y", value: 2 }] }, [opt("c", "x")])).toBeNull();
  });
});

describe("dimension and readiness scores", () => {
  const questions = [likert("q1", "lead"), likert("q2", "lead", { weight: 3 }), likert("q3", "lead", { reverse: true }), likert("q4", "comm")];

  it("an unanswered question changes the denominator, not the numerator", () => {
    // q1 = 100 (weight 1), q2 = 50 (weight 3), q3 unanswered.
    const answered = new Map([
      ["q1", 100],
      ["q2", 50],
    ]);
    expect(submissionDimensionScore("lead", questions, answered)).toBe((100 + 150) / 4);
    // Had q3 been zeroed instead, the score would have dropped to (100 + 150 + 0) / 5 = 50.
    expect(submissionDimensionScore("lead", questions, answered)).not.toBe(50);
  });

  it("dimension mean and spread over submissions; the index weights dimensions", () => {
    const answers = [ans("a", "q1", 5), ans("a", "q2", 5), ans("a", "q3", 1), ans("b", "q1", 1), ans("b", "q2", 1), ans("b", "q3", 5), ans("a", "q4", 3)];
    const matrix = scoreMatrix(questions, answers);
    const d = dimensionResult(lead, questions, matrix, ["a", "b"]);
    expect(d.n).toBe(2);
    expect(d.mean.value).toBe(50); // a scores 100 (q3 reversed), b scores 0
    expect(d.sd.value).toBeCloseTo(70.711, 3);
    const c = dimensionResult({ ...comm, weight: 3 }, questions, matrix, ["a", "b"]);
    expect(c.n).toBe(1);
    expect(c.mean.value).toBe(50);
    expect(c.sd).toEqual({ value: null, reason: "One response: there is no spread to show." });
    expect(readinessIndex([d, c]).value).toBe(50);
    expect(readinessIndex([{ ...d, mean: { value: 80 } }, c]).value).toBe((80 + 150) / 4);
  });

  it("all unanswered: no score, with a reason, not zero", () => {
    const matrix = scoreMatrix(questions, []);
    const d = dimensionResult(lead, questions, matrix, ["a", "b"]);
    expect(d).toMatchObject({ n: 0, mean: { value: null, reason: "No answers yet." } });
    expect(readinessIndex([d])).toEqual({ value: null, reason: "No answers yet." });
  });

  it("a single respondent scores, without a spread", () => {
    const matrix = scoreMatrix(questions, [ans("a", "q1", 4)]);
    const d = dimensionResult(lead, questions, matrix, ["a"]);
    expect(d.mean.value).toBe(75);
    expect(d.sd.value).toBeNull();
  });

  it("item results and the lowest items", () => {
    const matrix = scoreMatrix(questions, [ans("a", "q1", 5), ans("a", "q2", 2), ans("a", "q4", 3), ans("b", "q1", 4)]);
    const items = itemResults(questions, matrix, ["a", "b"]);
    expect(items.find((i) => i.id === "q1")).toMatchObject({ n: 2, mean: { value: 87.5 } });
    expect(items.find((i) => i.id === "q3")).toMatchObject({ n: 0, mean: { value: null } });
    expect(lowestItems(items, 2).map((i) => i.id)).toEqual(["q2", "q4"]);
  });
});

describe("segments", () => {
  const people = [
    ...Array.from({ length: 6 }, (_, i) => sub(`f${i}`, { department: "Finance", seniority: "frontline" })),
    ...Array.from({ length: 4 }, (_, i) => sub(`fe${i}`, { department: "Finance", seniority: "executive" })),
    ...Array.from({ length: 3 }, (_, i) => sub(`we${i}`, { department: "Warehouse", seniority: "executive" })),
  ];

  it("a group of four gives a reason, not a blank or a zero", () => {
    expect(guard(4)).toEqual({
      suppressed: true,
      n: 4,
      reason: "Hidden to protect anonymity: this group has 4 responses, and results are shown only for groups of 5 or more.",
    });
    expect(guard(MIN_SEGMENT)).toEqual({ suppressed: false, n: 5 });
  });

  it("suppression is judged on the intersection of filters", () => {
    expect(applyFilter(people, { department: "Finance" })).toHaveLength(10);
    expect(applyFilter(people, { seniority: "executive" })).toHaveLength(7);
    // Each filter alone is over five; together they are four.
    expect(applyFilter(people, { department: "Finance", seniority: "executive" })).toHaveLength(4);
  });
});

describe("perception gap", () => {
  const questions = [likert("q1", "lead")];
  it("leadership minus frontline, per dimension", () => {
    const subs = [
      ...Array.from({ length: 5 }, (_, i) => sub(`m${i}`, { seniority: i % 2 ? "manager" : "executive" })),
      ...Array.from({ length: 5 }, (_, i) => sub(`f${i}`, { seniority: i % 2 ? "frontline" : "supervisor" })),
    ];
    const answers = subs.map((s) => ans(s.id, "q1", s.id.startsWith("m") ? 5 : 2));
    const g = perceptionGap([lead], questions, scoreMatrix(questions, answers), subs);
    expect(g.rows[0]).toMatchObject({ leadership: 100, frontline: 25, gap: 75 });
  });

  it("is suppressed when either side is under five", () => {
    const subs = [...Array.from({ length: 4 }, (_, i) => sub(`m${i}`, { seniority: "manager" })), ...Array.from({ length: 9 }, (_, i) => sub(`f${i}`, { seniority: "frontline" }))];
    const g = perceptionGap([lead], questions, scoreMatrix(questions, subs.map((s) => ans(s.id, "q1", 3))), subs);
    expect(g.leadership.suppressed).toBe(true);
    expect(g.rows[0]!.gap).toBeNull();
  });
});

describe("reliability", () => {
  it("Cronbach's alpha on a known matrix", () => {
    // Three items, four respondents. Item variances ⅔, 1⅔ and 2 (sum 4⅓); the totals 4, 6, 8 and 12
    // vary by 11⅔. alpha = 3/2 × (1 − 4.3333 / 11.6667) = 0.942857, worked by hand.
    const rows = [
      [1, 1, 2],
      [2, 2, 2],
      [2, 3, 3],
      [3, 4, 5],
    ];
    expect(cronbachAlpha(rows).value).toBeCloseTo(0.942857, 6);
  });

  it("one item: undefined with a reason, no division by zero", () => {
    expect(cronbachAlpha([[1], [2], [3]])).toEqual({ value: null, reason: "Alpha needs at least two questions in the dimension." });
  });

  it("too few responses, or no variation at all, give a reason", () => {
    expect(cronbachAlpha([[1, 2]]).value).toBeNull();
    expect(cronbachAlpha([[3, 3], [3, 3]])).toEqual({ value: null, reason: "Every response was identical, so consistency cannot be measured." });
  });

  it("a low alpha is still reported, and an item that hurts it is flagged", () => {
    const questions = [likert("a", "lead"), likert("b", "lead"), likert("c", "lead")];
    const data = [
      [5, 5, 1],
      [4, 4, 5],
      [2, 2, 3],
      [1, 1, 4],
      [3, 4, 2],
    ];
    const answers = data.flatMap((row, i) => row.map((v, j) => ans(`s${i}`, ["a", "b", "c"][j]!, v)));
    const r = dimensionReliability(lead, questions, scoreMatrix(questions, answers));
    expect(r.n).toBe(5);
    expect(r.alpha.value).not.toBeNull();
    expect(r.alpha.value!).toBeLessThan(0.7);
    expect(r.itemRows.find((i) => i.id === "c")!.weak).toBe(true);
    expect(r.itemRows.find((i) => i.id === "a")!.weak).toBe(false);
  });

  it("reverse-scored items count the right way round", () => {
    const questions = [likert("a", "lead"), likert("b", "lead", { reverse: true })];
    const answers = [ans("s1", "a", 5), ans("s1", "b", 1), ans("s2", "a", 1), ans("s2", "b", 5), ans("s3", "a", 3), ans("s3", "b", 3)];
    expect(dimensionReliability(lead, questions, scoreMatrix(questions, answers)).alpha.value).toBeCloseTo(1);
  });
});

describe("response quality", () => {
  const questions = ["a", "b", "c", "d", "e"].map((id) => likert(id, "lead", { reverse: id === "e" }));
  it("flags straight-lining and speeding, advisory only", () => {
    const subs = [sub("same"), sub("fast", { durationSeconds: 40 }), sub("fine"), sub("unknown", { durationSeconds: null })];
    const answers = [
      ...questions.map((q) => ans("same", q.id, 4)),
      ...questions.map((q, i) => ans("fast", q.id, (i % 5) + 1)),
      ...questions.map((q, i) => ans("fine", q.id, i === 4 ? 2 : 4)),
    ];
    expect(qualityFlags(subs, questions, answers)).toEqual([
      { submissionId: "same", reasons: ["Gave the same answer to all 5 agreement questions, including the reverse-worded ones."] },
      { submissionId: "fast", reasons: ["Finished in 40 seconds (under 90)."] },
    ]);
  });
});

describe("the report", () => {
  const questions = [likert("q1", "lead"), likert("q2", "lead")];
  const people = (n: number, opts: Partial<Submission> = {}) => Array.from({ length: n }, (_, i) => sub(`p${i}`, opts));

  it("an anonymous assessment shows nothing until five people have submitted", () => {
    const four = people(4);
    const r = buildReport({ anonymous: true, dimensions: [lead], questions, submissions: four, answers: four.map((s) => ans(s.id, "q1", 4)) });
    expect(r.overall.suppressed).toBe(true);
    expect(r.scores).toBeNull();
    expect(r.reliability).toBeNull();
  });

  it("an identified assessment shows any number, but its segments still need five", () => {
    const four = people(4, { department: "Finance" });
    const r = buildReport({ anonymous: false, dimensions: [lead], questions, submissions: four, answers: four.map((s) => ans(s.id, "q1", 4)) });
    expect(r.scores!.index.value).toBe(75);
    expect(r.breakdowns![0]!.rows[0]).toMatchObject({ value: "Finance", guard: { suppressed: true, n: 4 }, index: null });
    expect(buildReport({ anonymous: false, dimensions: [lead], questions, submissions: four, answers: [] }, { department: "Finance" }).selection.suppressed).toBe(true);
  });
});
