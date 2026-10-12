import type { NarrativeKey } from "@/lib/db/schema/report";

/** The narrative blocks a consultant writes against a readiness report, in report order. */
export const NARRATIVE_LABELS: Record<NarrativeKey, { label: string; hint: string }> = {
  summary: { label: "Summary", hint: "The headline in two or three sentences: how ready they are, and the one thing that matters most." },
  findings: { label: "Findings", hint: "What the numbers say, dimension by dimension, and what you heard in the open answers." },
  recommendations: { label: "Recommendations", hint: "What should happen before go-live, who owns it, and by when." },
};
