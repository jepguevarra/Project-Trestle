import { Table, Td, Th } from "@/components/ui/table";
import type { Report } from "@/lib/scoring";
import { alpha, ALPHA_ACCEPTABLE, percent, score, show, signed, type Value } from "@/lib/scoring";
import { SENIORITY_LABELS, type Seniority } from "@/lib/views/respondent";
import { DimensionChart, GapChart } from "./charts";

/** A number cell that falls back to its reason as text, never a blank. */
export function Num({ v, format }: { v: Value; format?: (n: number) => string }) {
  const s = show(v, format);
  return <Td numeric={!s.reason} className={s.reason ? "text-muted-foreground" : undefined}>{s.text}</Td>;
}

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="rounded-md border border-border bg-muted px-3 py-2 text-sm">
      {children}
    </p>
  );
}

type Scores = NonNullable<Report["scores"]>;

export function DimensionTable({ scores, report, showAlpha = true }: { scores: Scores; report: Report; showAlpha?: boolean }) {
  const alphaOf = (id: string) => report.reliability?.find((r) => r.id === id)?.alpha;
  return (
    <Table>
      <thead>
        <tr>
          <Th>Dimension</Th>
          <Th numeric>Score</Th>
          <Th numeric>Spread (SD)</Th>
          <Th numeric>Responses</Th>
          {showAlpha ? <Th numeric>Alpha</Th> : null}
        </tr>
      </thead>
      <tbody>
        {scores.dimensions.map((d) => {
          const a = alphaOf(d.id);
          return (
            <tr key={d.id}>
              <Td>{d.name}</Td>
              <Num v={d.mean} />
              <Num v={d.sd} />
              <Td numeric>{d.n}</Td>
              {showAlpha && a ? <Num v={a} format={alpha} /> : null}
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

export function Overview({
  report,
  completion,
  dimensionNames,
}: {
  report: Report;
  completion: { department: string | null; total: number; invited: number; completed: number }[];
  dimensionNames: Map<string, string>;
}) {
  const invited = completion.reduce((a, c) => a + c.invited, 0);
  const completed = completion.reduce((a, c) => a + c.completed, 0);
  const scores = report.scores;
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end gap-x-10 gap-y-3">
        <div>
          <p className="text-sm text-muted-foreground">Readiness index</p>
          <p className="text-xl font-semibold tabular-nums" data-testid="readiness-index">
            {scores && scores.index.value !== null ? score(scores.index.value) : "—"}
            <span className="text-sm font-normal text-muted-foreground"> / 100</span>
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Response rate</p>
          <p className="text-xl font-semibold tabular-nums">
            {percent(completed, invited)}
            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              {completed} of {invited} invited
            </span>
          </p>
        </div>
      </div>

      {report.overall.suppressed ? <Notice>{report.overall.reason}</Notice> : null}

      {scores ? (
        <>
          <section aria-labelledby="dimensions-heading" className="grid gap-3">
            <h2 id="dimensions-heading" className="text-base font-semibold">
              Dimensions
            </h2>
            <p className="text-sm text-muted-foreground">
              Each point is the dimension&apos;s mean score out of 100; the whisker spans one standard deviation either side. A wide
              whisker means people disagree.
            </p>
            <DimensionChart data={scores.dimensions.flatMap((d) => (d.mean.value === null ? [] : [{ name: d.name, mean: d.mean.value, sd: d.sd.value }]))} />
            <DimensionTable scores={scores} report={report} />
          </section>

          <section aria-labelledby="lowest-heading" className="grid gap-3">
            <h2 id="lowest-heading" className="text-base font-semibold">
              Lowest-scoring questions
            </h2>
            <Table>
              <thead>
                <tr>
                  <Th>Question</Th>
                  <Th>Dimension</Th>
                  <Th numeric>Score</Th>
                  <Th numeric>Spread (SD)</Th>
                  <Th numeric>Responses</Th>
                </tr>
              </thead>
              <tbody>
                {scores.lowest.map((i) => (
                  <tr key={i.id}>
                    <Td>
                      {i.text}
                      {i.reverse ? <span className="text-muted-foreground"> (reverse-worded: a low score means people agreed)</span> : null}
                    </Td>
                    <Td>{dimensionNames.get(i.dimensionId)}</Td>
                    <Num v={i.mean} />
                    <Num v={i.sd} />
                    <Td numeric>{i.n}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </section>
        </>
      ) : null}

      <section aria-labelledby="completion-heading" className="grid gap-3">
        <h2 id="completion-heading" className="text-base font-semibold">
          Completion by department
        </h2>
        <Table>
          <thead>
            <tr>
              <Th>Department</Th>
              <Th numeric>Invited</Th>
              <Th numeric>Answered</Th>
              <Th numeric>Rate</Th>
            </tr>
          </thead>
          <tbody>
            {completion.map((c) => (
              <tr key={c.department ?? ""}>
                <Td>{c.department ?? <span className="text-muted-foreground">Not set</span>}</Td>
                <Td numeric>{c.invited}</Td>
                <Td numeric>{c.completed}</Td>
                <Td numeric>{percent(c.completed, c.invited)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </section>
    </div>
  );
}

const ATTR_LABELS = { department: "Department", roleTitle: "Role", seniority: "Seniority" } as const;
const valueLabel = (key: keyof typeof ATTR_LABELS, v: string) => (key === "seniority" ? (SENIORITY_LABELS[v as Seniority] ?? v) : v);

export function Segments({
  report,
  filter,
  action,
}: {
  report: Report;
  filter: { department?: string; roleTitle?: string; seniority?: string };
  action: string;
}) {
  if (report.overall.suppressed) return <Notice>{report.overall.reason}</Notice>;
  const select = (key: keyof typeof ATTR_LABELS, name: string) => (
    <label className="grid gap-1 text-sm">
      <span className="text-muted-foreground">{ATTR_LABELS[key]}</span>
      <select name={name} defaultValue={filter[key] ?? ""} className="h-9 rounded-md border border-input bg-card px-2">
        <option value="">All</option>
        {report.filterValues[key].map((v) => (
          <option key={v} value={v}>
            {valueLabel(key, v)}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="grid gap-6">
      <form method="get" action={action} className="flex flex-wrap items-end gap-3" aria-label="Filters">
        <input type="hidden" name="tab" value="segments" />
        {select("department", "department")}
        {select("roleTitle", "role")}
        {select("seniority", "seniority")}
        <button type="submit" className="h-9 rounded-md border border-border bg-card px-3 text-sm font-semibold hover:bg-muted">
          Apply
        </button>
      </form>
      <p className="text-sm text-muted-foreground">
        Filters combine. Results appear only when at least five people match all of them together, so no one can be singled out.
      </p>
      {report.selection.suppressed ? (
        <Notice>{report.selection.reason}</Notice>
      ) : report.scores ? (
        <section aria-labelledby="selection-heading" className="grid gap-3">
          <h2 id="selection-heading" className="text-base font-semibold">
            Selected group: {report.selection.n} responses, readiness {show(report.scores.index).text}
          </h2>
          <DimensionTable scores={report.scores} report={report} showAlpha={false} />
        </section>
      ) : null}
      {report.breakdowns?.map((b) => (
        <section key={b.key} aria-labelledby={`by-${b.key}`} className="grid gap-2">
          <h2 id={`by-${b.key}`} className="text-base font-semibold">
            By {ATTR_LABELS[b.key].toLowerCase()}
          </h2>
          {b.rows.length ? (
            <Table>
              <thead>
                <tr>
                  <Th>{ATTR_LABELS[b.key]}</Th>
                  <Th numeric>Responses</Th>
                  <Th numeric>Readiness</Th>
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r) => (
                  <tr key={r.value}>
                    <Td>{valueLabel(b.key, r.value)}</Td>
                    <Td numeric>{r.guard.n}</Td>
                    {r.guard.suppressed ? <Td className="text-muted-foreground">{r.guard.reason}</Td> : <Num v={r.index!} />}
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Nobody has a {ATTR_LABELS[b.key].toLowerCase()} recorded.</p>
          )}
        </section>
      ))}
    </div>
  );
}

export function Gap({ report }: { report: Report }) {
  if (report.overall.suppressed || !report.gap) return <Notice>{report.overall.suppressed ? report.overall.reason : "No answers yet."}</Notice>;
  const { leadership, frontline, rows } = report.gap;
  const reasons = [leadership, frontline].flatMap((g) => (g.suppressed ? [g.reason] : []));
  return (
    <div className="grid gap-4">
      <p className="max-w-3xl text-sm text-muted-foreground">
        Leadership (managers and executives) minus frontline (frontline staff and supervisors), per dimension. A positive gap means
        leaders feel readier than the people who will use the system every day.
      </p>
      {reasons.length ? (
        reasons.map((r) => <Notice key={r}>{r}</Notice>)
      ) : (
        <>
          <GapChart data={rows.flatMap((r) => (r.leadership === null || r.frontline === null ? [] : [{ name: r.name, leadership: r.leadership, frontline: r.frontline }]))} />
          <p className="text-sm text-muted-foreground">Darker point: leadership. Lighter point: frontline.</p>
          <Table>
            <thead>
              <tr>
                <Th>Dimension</Th>
                <Th numeric>Frontline ({frontline.n})</Th>
                <Th numeric>Leadership ({leadership.n})</Th>
                <Th numeric>Gap</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td>{r.name}</Td>
                  <Td numeric>{r.frontline === null ? "—" : score(r.frontline)}</Td>
                  <Td numeric>{r.leadership === null ? "—" : score(r.leadership)}</Td>
                  <Td numeric>{r.gap === null ? "—" : signed(r.gap)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}
    </div>
  );
}

export function Reliability({ report }: { report: Report }) {
  if (!report.reliability) return <Notice>{report.overall.suppressed ? report.overall.reason : "No answers yet."}</Notice>;
  return (
    <div className="grid gap-6">
      <p className="max-w-3xl text-sm text-muted-foreground">
        Cronbach&apos;s alpha says whether a dimension&apos;s questions measure the same thing, on the answers collected here. 0.70 or above
        is the usual bar. A weak question correlates poorly with the rest of its dimension, or the dimension would be more consistent
        without it. Worth a look; not a verdict.
      </p>
      <Table>
        <thead>
          <tr>
            <Th>Dimension</Th>
            <Th numeric>Questions</Th>
            <Th numeric>Complete responses</Th>
            <Th numeric>Alpha</Th>
            <Th>Reading</Th>
          </tr>
        </thead>
        <tbody>
          {report.reliability.map((r) => (
            <tr key={r.id}>
              <Td>{r.name}</Td>
              <Td numeric>{r.items}</Td>
              <Td numeric>{r.n}</Td>
              <Num v={r.alpha} format={alpha} />
              <Td>{r.alpha.value === null ? "" : r.alpha.value >= ALPHA_ACCEPTABLE ? "Acceptable" : "Below 0.70"}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {report.reliability.map((r) => (
        <section key={r.id} aria-labelledby={`rel-${r.id}`} className="grid gap-2">
          <h2 id={`rel-${r.id}`} className="text-base font-semibold">
            {r.name}
          </h2>
          <Table>
            <thead>
              <tr>
                <Th>Question</Th>
                <Th numeric>Item-total r</Th>
                <Th numeric>Alpha without it</Th>
                <Th>Flag</Th>
              </tr>
            </thead>
            <tbody>
              {r.itemRows.map((i) => (
                <tr key={i.id}>
                  <Td>{i.text}</Td>
                  <Num v={i.itemTotal} format={alpha} />
                  <Num v={i.alphaIfDeleted} format={alpha} />
                  <Td>{i.weak ? "Weak" : ""}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </section>
      ))}
    </div>
  );
}

export function Quality({ report, submissionNumber }: { report: Report; submissionNumber: Map<string, number> }) {
  if (!report.flags) return <Notice>{report.overall.suppressed ? report.overall.reason : "No answers yet."}</Notice>;
  return (
    <div className="grid gap-4">
      <p className="max-w-3xl text-sm text-muted-foreground">
        These flags are advisory. Nothing is excluded from the scores automatically: you decide whether a flagged submission changes
        what you report.
      </p>
      {report.flags.length === 0 ? (
        <p className="text-sm">No submissions are flagged.</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Submission</Th>
              <Th>Why it is flagged</Th>
            </tr>
          </thead>
          <tbody>
            {report.flags.map((f) => (
              <tr key={f.submissionId}>
                <Td className="whitespace-nowrap">Submission {submissionNumber.get(f.submissionId)}</Td>
                <Td>{f.reasons.join(" ")}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
