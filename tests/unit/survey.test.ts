import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { draftsToRaw, normaliseAnswers, type SurveyQuestion } from "@/lib/survey/answers";
import { mintSurveyToken, staleReason, surveyTokenExpiry, verifySurveyToken, type SurveyClaims } from "@/lib/tokens/survey";

const key = "k".repeat(40);
const r = "11111111-1111-4111-8111-111111111111";
const i = "22222222-2222-4222-8222-222222222222";
const now = new Date("2026-10-01T00:00:00Z");
const claims: SurveyClaims = { r, i, v: 1, e: 1, exp: Math.floor(now.getTime() / 1000) + 3600 };

describe("survey tokens", () => {
  it("round-trips", () => {
    const v = verifySurveyToken(mintSurveyToken(claims, key), key, now);
    expect(v).toEqual({ ok: true, claims });
  });

  it("rejects an expired token", () => {
    const token = mintSurveyToken({ ...claims, exp: Math.floor(now.getTime() / 1000) - 1 }, key);
    expect(verifySurveyToken(token, key, now)).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects tampering: changed claims, a changed signature, or another key", () => {
    const token = mintSurveyToken(claims, key);
    const [, sig] = token.split(".");
    const forged = `${Buffer.from(JSON.stringify({ ...claims, r: i })).toString("base64url")}.${sig}`;
    expect(verifySurveyToken(forged, key, now)).toEqual({ ok: false, reason: "signature" });
    expect(verifySurveyToken(token.slice(0, -2) + "xx", key, now)).toEqual({ ok: false, reason: "signature" });
    expect(verifySurveyToken(token, "x".repeat(40), now)).toEqual({ ok: false, reason: "signature" });
  });

  it("rejects malformed input without throwing", () => {
    for (const bad of ["", "abc", "a.b.c", ".", "x".repeat(2000)]) {
      expect(verifySurveyToken(bad, key, now).ok).toBe(false);
    }
    // Correctly signed but not our claim shape.
    const payload = Buffer.from(JSON.stringify({ r: "not-a-uuid" })).toString("base64url");
    const sig = createHmac("sha256", key).update(payload).digest("base64url");
    expect(verifySurveyToken(`${payload}.${sig}`, key, now)).toEqual({ ok: false, reason: "malformed" });
  });

  it("a wrong instrument or a stale version is refused", () => {
    expect(staleReason(claims, { instrumentId: i, tokenVersion: 1, tokenEpoch: 1 })).toBeNull();
    expect(staleReason(claims, { instrumentId: r, tokenVersion: 1, tokenEpoch: 1 })).toBe("wrong_instrument");
    expect(staleReason(claims, { instrumentId: i, tokenVersion: 2, tokenEpoch: 1 })).toBe("revoked");
    expect(staleReason(claims, { instrumentId: i, tokenVersion: 1, tokenEpoch: 2 })).toBe("revoked");
  });

  it("expires at the close date, or 90 days out without one", () => {
    const closes = new Date("2026-11-01T00:00:00Z");
    expect(surveyTokenExpiry(closes, now)).toBe(closes.getTime() / 1000);
    expect(surveyTokenExpiry(null, now)).toBe(now.getTime() / 1000 + 90 * 86400);
  });
});

const q = (id: string, type: SurveyQuestion["type"], options: string[] = []): SurveyQuestion => ({ id, type, options: options.map((o) => ({ id: o })) });
const ids = Array.from({ length: 8 }, (_, n) => `00000000-0000-4000-8000-00000000000${n}`);
const questions = [
  q(ids[0]!, "likert_5"),
  q(ids[1]!, "likert_7"),
  q(ids[2]!, "single_choice", [ids[6]!, ids[7]!]),
  q(ids[3]!, "multi_choice", [ids[6]!, ids[7]!]),
  q(ids[4]!, "open_text"),
  q(ids[5]!, "numeric"),
];

describe("answers", () => {
  it("normalises each type and treats empty as cleared", () => {
    const res = normaliseAnswers(questions, {
      [ids[0]!]: "4",
      [ids[1]!]: "7",
      [ids[2]!]: ids[6]!,
      [ids[3]!]: [ids[6]!, ids[7]!, ids[6]!],
      [ids[4]!]: "",
      [ids[5]!]: " 12.5 ",
    });
    expect(res).toEqual({
      ok: true,
      cleared: [ids[4]],
      answers: [
        { questionId: ids[0], valueNumeric: 4, valueText: null, optionIds: null },
        { questionId: ids[1], valueNumeric: 7, valueText: null, optionIds: null },
        { questionId: ids[2], valueNumeric: null, valueText: null, optionIds: [ids[6]] },
        { questionId: ids[3], valueNumeric: null, valueText: null, optionIds: [ids[6], ids[7]] },
        { questionId: ids[5], valueNumeric: 12.5, valueText: null, optionIds: null },
      ],
    });
  });

  it.each([
    ["an unknown question", { [ids[7]!]: "1" }],
    ["a 5-point value of 6", { [ids[0]!]: "6" }],
    ["a scale value of 0", { [ids[1]!]: "0" }],
    ["an option from elsewhere", { [ids[2]!]: ids[0]! }],
    ["several values for a single choice", { [ids[2]!]: [ids[6]!, ids[7]!] }],
    ["a number that is not one", { [ids[5]!]: "twelve" }],
  ])("rejects %s", (_, raw) => {
    expect(normaliseAnswers(questions, raw)).toEqual({ ok: false });
  });

  it("drafts read back into the page's shape", () => {
    expect(
      draftsToRaw(questions, [
        { questionId: ids[0]!, valueNumeric: 3, valueText: null, optionIds: null },
        { questionId: ids[3]!, valueNumeric: null, valueText: null, optionIds: [ids[7]!] },
        { questionId: ids[2]!, valueNumeric: null, valueText: null, optionIds: [ids[6]!] },
        { questionId: ids[4]!, valueNumeric: null, valueText: "Hi", optionIds: null },
      ]),
    ).toEqual({ [ids[0]!]: "3", [ids[3]!]: [ids[7]], [ids[2]!]: ids[6], [ids[4]!]: "Hi" });
  });
});
