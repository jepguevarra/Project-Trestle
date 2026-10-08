import { writeFileSync } from "node:fs";
import { renderReviewDoc } from "@/lib/instruments/review-doc";

writeFileSync("docs/READINESS-INSTRUMENT.md", renderReviewDoc());
console.log("Wrote docs/READINESS-INSTRUMENT.md");
