import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Report } from "@/lib/scoring";
import { alpha, percent, score, show, type Value } from "@/lib/scoring";
import { NARRATIVE_LABELS } from "@/lib/views/report";
import type { NarrativeKey } from "@/lib/db/schema/report";

// The readiness report as a PDF (phase 05). Same numbers as the screen, from the same
// lib/scoring output. Built-in Helvetica only, so the file opens anywhere without embedded fonts;
// text sticks to characters that font has (a plain hyphen for minus, no ≥).

const ACCENT = "#2f5b73";
const MUTED = "#5f6b76";
const RULE = "#d9dee3";

const s = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 56, paddingHorizontal: 44, fontFamily: "Helvetica", fontSize: 10, color: "#1f2933", lineHeight: 1.4 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: RULE, paddingBottom: 10, marginBottom: 18 },
  firm: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  logo: { maxHeight: 32, maxWidth: 140, objectFit: "contain" },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  muted: { color: MUTED },
  h2: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 18, marginBottom: 6 },
  hero: { flexDirection: "row", gap: 36, marginTop: 14 },
  heroValue: { fontSize: 22, fontFamily: "Helvetica-Bold", lineHeight: 1.2, marginBottom: 2 },
  table: { borderTopWidth: 1, borderTopColor: RULE },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: RULE, paddingVertical: 4 },
  th: { fontFamily: "Helvetica-Bold", color: MUTED },
  num: { textAlign: "right" },
  notice: { borderWidth: 1, borderColor: RULE, padding: 8, marginTop: 10 },
  footer: { position: "absolute", bottom: 24, fontSize: 8, color: MUTED },
  track: { height: 8, position: "relative", marginTop: 3 },
});

const pdfSigned = (n: number) => `${n > 0 ? "+" : n < 0 ? "-" : ""}${Math.abs(n).toFixed(1)}`;
const cell = (v: Value, f = score) => show(v, f).text;

function Row({ cells, widths, header, numeric = [] }: { cells: string[]; widths: number[]; header?: boolean; numeric?: number[] }) {
  return (
    <View style={s.row} wrap={false}>
      {cells.map((c, i) => (
        <Text key={i} style={[{ width: `${widths[i]}%`, paddingRight: 6 }, header ? s.th : {}, numeric.includes(i) ? s.num : {}]}>
          {c}
        </Text>
      ))}
    </View>
  );
}

/** A point at the mean with a line spanning one standard deviation, on a 0-100 track. */
function Whisker({ mean, sd }: { mean: number; sd: number | null }) {
  const lo = Math.max(0, mean - (sd ?? 0));
  const hi = Math.min(100, mean + (sd ?? 0));
  return (
    <View style={s.track}>
      <View style={{ position: "absolute", left: 0, right: 0, top: 3.5, height: 1, backgroundColor: RULE }} />
      <View style={{ position: "absolute", left: `${lo}%`, width: `${hi - lo}%`, top: 3, height: 2, backgroundColor: ACCENT }} />
      <View style={{ position: "absolute", left: `${mean}%`, top: 0, width: 8, height: 8, marginLeft: -4, borderRadius: 4, backgroundColor: ACCENT }} />
    </View>
  );
}

export type ReadinessPdfProps = {
  firmName: string;
  logo: { data: Buffer; format: "png" | "jpg" } | null;
  title: string;
  clientName: string;
  engagementName: string;
  targetSystem: string;
  anonymous: boolean;
  status: string;
  generatedAt: Date;
  invited: number;
  completed: number;
  report: Report;
  narratives: Partial<Record<NarrativeKey, string>>;
};

export function ReadinessPdf(p: ReadinessPdfProps) {
  const { report } = p;
  const scores = report.scores;
  const alphaOf = (id: string) => report.reliability?.find((r) => r.id === id)?.alpha;
  const dimName = new Map(scores?.dimensions.map((d) => [d.id, d.name]) ?? []);
  const date = p.generatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <Document title={`${p.title}: ${p.clientName}`} author={p.firmName} creator="Trestle" producer="Trestle">
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          <Text style={s.firm}>{p.firmName}</Text>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image has no alt; the firm's name is beside it */}
          {p.logo ? <Image style={s.logo} src={p.logo} /> : null}
        </View>

        <Text style={s.title}>{p.title}</Text>
        <Text style={s.muted}>
          {p.clientName} · {p.engagementName} · {p.targetSystem}
        </Text>
        <Text style={s.muted}>
          {date} · {p.anonymous ? "Anonymous" : "Identified"} · {p.status}
        </Text>

        <View style={s.hero}>
          <View>
            <Text style={s.muted}>Readiness index</Text>
            <Text style={s.heroValue}>{scores && scores.index.value !== null ? `${score(scores.index.value)} / 100` : "-"}</Text>
          </View>
          <View>
            <Text style={s.muted}>Response rate</Text>
            <Text style={s.heroValue}>{percent(p.completed, p.invited)}</Text>
            <Text style={s.muted}>
              {p.completed} of {p.invited} invited
            </Text>
          </View>
        </View>

        {report.overall.suppressed ? (
          <View style={s.notice}>
            <Text>{report.overall.reason}</Text>
          </View>
        ) : null}

        {scores ? (
          <>
            <Text style={s.h2}>Dimensions</Text>
            <Text style={[s.muted, { marginBottom: 6 }]}>
              Scores are out of 100. The spread (standard deviation) shows how much people disagree; the line spans one standard
              deviation either side of the mean.
            </Text>
            <View style={s.table}>
              <Row header cells={["Dimension", "Score", "Spread", "n", "Alpha", "0 to 100"]} widths={[28, 10, 10, 6, 9, 37]} numeric={[1, 2, 3, 4]} />
              {scores.dimensions.map((d) => {
                const a = alphaOf(d.id);
                return (
                  <View key={d.id} style={s.row} wrap={false}>
                    <Text style={{ width: "28%", paddingRight: 6 }}>{d.name}</Text>
                    <Text style={[{ width: "10%", paddingRight: 6 }, s.num]}>{d.mean.value === null ? "-" : score(d.mean.value)}</Text>
                    <Text style={[{ width: "10%", paddingRight: 6 }, s.num]}>{d.sd.value === null ? "-" : score(d.sd.value)}</Text>
                    <Text style={[{ width: "6%", paddingRight: 6 }, s.num]}>{d.n}</Text>
                    <Text style={[{ width: "9%", paddingRight: 6 }, s.num]}>{a && a.value !== null ? alpha(a.value) : "-"}</Text>
                    <View style={{ width: "37%" }}>{d.mean.value !== null ? <Whisker mean={d.mean.value} sd={d.sd.value} /> : null}</View>
                  </View>
                );
              })}
            </View>
            <Text style={[s.muted, { marginTop: 4, fontSize: 8 }]}>
              Alpha (Cronbach) measures whether a dimension&apos;s questions hang together; 0.70 or above is the usual bar.
            </Text>

            <Text style={s.h2}>Lowest-scoring questions</Text>
            <View style={s.table}>
              <Row header cells={["Question", "Dimension", "Score", "Spread", "n"]} widths={[52, 22, 9, 9, 8]} numeric={[2, 3, 4]} />
              {scores.lowest.map((i) => (
                <Row
                  key={i.id}
                  cells={[i.reverse ? `${i.text} (reverse-worded)` : i.text, dimName.get(i.dimensionId) ?? "", cell(i.mean), cell(i.sd), String(i.n)]}
                  widths={[52, 22, 9, 9, 8]}
                  numeric={[2, 3, 4]}
                />
              ))}
            </View>

            {report.gap ? (
              <View wrap={false}>
                <Text style={s.h2}>Perception gap</Text>
                {report.gap.leadership.suppressed || report.gap.frontline.suppressed ? (
                  <Text style={s.muted}>
                    {[report.gap.leadership, report.gap.frontline].flatMap((g) => (g.suppressed ? [g.reason] : [])).join(" ")}
                  </Text>
                ) : (
                  <>
                    <Text style={[s.muted, { marginBottom: 6 }]}>Leadership (managers, executives) minus frontline (frontline staff, supervisors).</Text>
                    <View style={s.table}>
                      <Row
                        header
                        cells={["Dimension", `Frontline (${report.gap.frontline.n})`, `Leadership (${report.gap.leadership.n})`, "Gap"]}
                        widths={[40, 20, 20, 20]}
                        numeric={[1, 2, 3]}
                      />
                      {report.gap.rows.map((r) => (
                        <Row
                          key={r.id}
                          cells={[r.name, r.frontline === null ? "-" : score(r.frontline), r.leadership === null ? "-" : score(r.leadership), r.gap === null ? "-" : pdfSigned(r.gap)]}
                          widths={[40, 20, 20, 20]}
                          numeric={[1, 2, 3]}
                        />
                      ))}
                    </View>
                  </>
                )}
              </View>
            ) : null}
          </>
        ) : null}

        {(Object.keys(NARRATIVE_LABELS) as NarrativeKey[]).map((k) =>
          p.narratives[k] ? (
            <View key={k}>
              <Text style={s.h2} minPresenceAhead={40}>
                {NARRATIVE_LABELS[k].label}
              </Text>
              <Text>{p.narratives[k]}</Text>
            </View>
          ) : null,
        )}

        <Text style={s.h2}>How to read this report</Text>
        <Text style={s.muted}>
          Each answer is converted to a score from 0 to 100; reverse-worded questions are flipped so that a higher score always means
          more ready. A dimension&apos;s score is the average of each person&apos;s weighted score on its questions; questions someone did
          not answer are left out rather than counted as zero. The readiness index is the weighted average of the dimension scores.
          {p.anonymous
            ? " Answers are anonymous: no answer is stored with a name, and no result is shown for a group of fewer than five people."
            : " No breakdown is shown for a group of fewer than five people."}
        </Text>

        <Text style={[s.footer, { left: 44 }]} fixed>
          {p.firmName} · {p.clientName}
        </Text>
        <Text style={[s.footer, { left: 44, right: 44, textAlign: "right" }]} fixed render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </Page>
    </Document>
  );
}
