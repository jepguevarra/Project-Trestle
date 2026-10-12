import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NarrativeEditor } from "@/components/results/narrative-editor";
import { Gap, Notice, Overview, Quality, Reliability, Segments } from "@/components/results/sections";
import { ThemeTagger } from "@/components/results/theme-tagger";
import { buttonVariants } from "@/components/ui/button";
import { requireEngagementAccess } from "@/lib/auth/engagement";
import { claimsFor } from "@/lib/auth/session";
import { withRls } from "@/lib/db";
import { findInstrument } from "@/lib/db/queries/instruments";
import { completionByDepartment, listNarratives, loadReportInput, openTextAnswers } from "@/lib/db/queries/results";
import { NARRATIVE_KEYS } from "@/lib/db/schema/report";
import { NARRATIVE_LABELS } from "@/lib/views/report";
import { buildReport, type SegmentFilter } from "@/lib/scoring";
import { SENIORITIES, type Seniority } from "@/lib/views/respondent";
import { cn } from "@/lib/utils";
import { addThemeAction, removeThemeAction, saveNarrativeAction } from "./actions";

export const metadata: Metadata = { title: "Results" };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TABS = [
  ["overview", "Overview"],
  ["segments", "Segments"],
  ["gap", "Perception gap"],
  ["reliability", "Reliability"],
  ["quality", "Response quality"],
  ["text", "Open answers"],
  ["narrative", "Narrative"],
] as const;
type Tab = (typeof TABS)[number][0];


const one = (v: string | string[] | undefined) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 120) : undefined);

/**
 * The readiness results (phase 05). A bespoke screen: the view kit lists and edits records, and this
 * is a report. Every number comes from lib/scoring; this page only lays it out.
 */
export default async function ResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; id: string; instrumentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgSlug, id, instrumentId } = await params;
  const sp = await searchParams;
  const { org, user, engagement, canEdit } = await requireEngagementAccess(orgSlug, id);
  if (!uuid.test(instrumentId)) notFound();
  const tab: Tab = TABS.some(([k]) => k === sp.tab) ? (sp.tab as Tab) : "overview";
  const seniority = one(sp.seniority);
  const filter: SegmentFilter = {
    department: one(sp.department),
    roleTitle: one(sp.role),
    seniority: seniority && (SENIORITIES as readonly string[]).includes(seniority) ? (seniority as Seniority) : undefined,
  };

  const data = await withRls(claimsFor(user), async (tx) => {
    const row = await findInstrument(tx, org.id, engagement.id, instrumentId);
    if (!row) return null;
    const anonymous = row.instrument.anonymity === "anonymous";
    return {
      inst: row.instrument,
      input: await loadReportInput(tx, org.id, instrumentId, anonymous),
      completion: await completionByDepartment(tx, org.id, instrumentId),
      text: tab === "text" ? await openTextAnswers(tx, org.id, instrumentId) : [],
      narratives: tab === "narrative" ? await listNarratives(tx, org.id, instrumentId) : {},
    };
  });
  if (!data) notFound();
  const { inst, input, completion } = data;
  const report = buildReport(input, tab === "segments" ? filter : {});

  const readiness = `/${org.slug}/engagements/${engagement.id}/readiness`;
  const base = `${readiness}/${inst.id}/results`;
  const bind = <A extends unknown[], R>(fn: (orgSlug: string, id: string, ...rest: A) => R) => fn.bind(null, org.slug, engagement.id);
  const dimensionNames = new Map(input.dimensions.map((d) => [d.id, d.name]));
  const openQuestions = input.questions.filter((q) => q.type === "open_text");

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-3">
        <nav aria-label="Breadcrumb" className="text-sm">
          <Link href={readiness as never} className="text-muted-foreground underline-offset-4 hover:underline">
            Readiness
          </Link>
          <span className="px-1 text-muted-foreground">/</span>
          <Link href={`${readiness}/${inst.id}` as never} className="text-muted-foreground underline-offset-4 hover:underline">
            {inst.name}
          </Link>
          <span className="px-1 text-muted-foreground">/</span>
          <span className="font-semibold">Results</span>
        </nav>
        <a href={`/api/exports/readiness/${inst.id}`} className={cn("ml-auto", buttonVariants({ variant: "outline", size: "sm" }))}>
          Export PDF
        </a>
      </div>

      <p className="text-sm text-muted-foreground">
        {input.submissions.length} {input.submissions.length === 1 ? "submission" : "submissions"} ·{" "}
        {inst.anonymity === "anonymous" ? "Anonymous" : "Identified"} · {inst.status === "open" ? "Still open: results update as answers arrive." : inst.status === "closed" ? "Closed." : "Draft."}
      </p>

      <nav aria-label="Results" className="flex flex-wrap gap-1 border-b border-border text-sm">
        {TABS.map(([key, label]) => (
          <Link
            key={key}
            href={`${base}${key === "overview" ? "" : `?tab=${key}`}` as never}
            aria-current={tab === key ? "page" : undefined}
            className={cn("-mb-px border-b-2 px-3 py-2", tab === key ? "border-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tab === "overview" ? <Overview report={report} completion={completion} dimensionNames={dimensionNames} /> : null}
      {tab === "segments" ? <Segments report={report} filter={filter} action={base} /> : null}
      {tab === "gap" ? <Gap report={report} /> : null}
      {tab === "reliability" ? <Reliability report={report} /> : null}
      {tab === "quality" ? <Quality report={report} submissionNumber={new Map(input.submissions.map((s, i) => [s.id, i + 1]))} /> : null}

      {tab === "text" ? (
        report.overall.suppressed ? (
          <Notice>{report.overall.reason}</Notice>
        ) : openQuestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">This assessment has no open questions.</p>
        ) : (
          <div className="grid gap-8">
            <p className="max-w-3xl text-sm text-muted-foreground">
              Answers are listed in no particular order and without department, role or seniority, so they cannot be traced back to anyone.
              Tag each with a theme to see what comes up most.
            </p>
            {openQuestions.map((q) => {
              const answers = data.text.filter((a) => a.questionId === q.id);
              const counts = new Map<string, number>();
              for (const a of answers) for (const t of a.themes) counts.set(t.theme, (counts.get(t.theme) ?? 0) + 1);
              const suggestions = [...new Set(data.text.flatMap((a) => a.themes.map((t) => t.theme)))].sort();
              return (
                <section key={q.id} aria-labelledby={`q-${q.id}`} className="grid gap-3">
                  <h2 id={`q-${q.id}`} className="text-base font-semibold">
                    {q.text} <span className="font-normal text-muted-foreground">({answers.length})</span>
                  </h2>
                  {counts.size ? (
                    <p className="text-sm">
                      Themes:{" "}
                      {[...counts]
                        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                        .map(([t, n]) => `${t} (${n})`)
                        .join(", ")}
                    </p>
                  ) : null}
                  {answers.length === 0 ? <p className="text-sm text-muted-foreground">No answers.</p> : null}
                  <ul className="grid gap-3">
                    {answers.map((a) => (
                      <li key={a.id} className="grid gap-2 border-b border-border pb-3 last:border-b-0">
                        <p className="text-sm whitespace-pre-wrap">{a.text}</p>
                        <ThemeTagger
                          instrumentId={inst.id}
                          responseId={a.id}
                          themes={a.themes}
                          suggestions={suggestions}
                          addAction={bind(addThemeAction)}
                          removeAction={bind(removeThemeAction)}
                          canEdit={canEdit}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )
      ) : null}

      {tab === "narrative" ? (
        <div className="grid max-w-3xl gap-6">
          <p className="text-sm text-muted-foreground">Your own words. They appear in the exported report after the numbers.</p>
          {NARRATIVE_KEYS.map((key) => (
            <NarrativeEditor
              key={key}
              action={bind(saveNarrativeAction)}
              instrumentId={inst.id}
              narrativeKey={key}
              label={NARRATIVE_LABELS[key].label}
              hint={NARRATIVE_LABELS[key].hint}
              initial={data.narratives[key] ?? ""}
              canEdit={canEdit}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
