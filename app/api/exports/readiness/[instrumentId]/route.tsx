import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse, type NextRequest } from "next/server";
import { claimsFor, getCurrentUser } from "@/lib/auth/session";
import { withRls } from "@/lib/db";
import { completionByDepartment, findInstrumentForReport, findLogo, listNarratives, loadReportInput } from "@/lib/db/queries/results";
import { ReadinessPdf } from "@/lib/pdf/readiness-report";
import { buildReport } from "@/lib/scoring";

// The readiness report as a PDF. Rendered under the user's own session, so RLS decides what they may
// export exactly as it decides what they may see; nothing is stored.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS = { draft: "Draft", open: "Open", closed: "Closed" } as const;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ instrumentId: string }> }) {
  const { instrumentId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to export reports." }, { status: 401 });
  if (!uuid.test(instrumentId)) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const data = await withRls(claimsFor(user), async (tx) => {
    const found = await findInstrumentForReport(tx, instrumentId);
    if (!found) return null;
    const orgId = found.instrument.orgId;
    const anonymous = found.instrument.anonymity === "anonymous";
    return {
      found,
      input: await loadReportInput(tx, orgId, instrumentId, anonymous),
      completion: await completionByDepartment(tx, orgId, instrumentId),
      narratives: await listNarratives(tx, orgId, instrumentId),
      logo: await findLogo(tx, orgId),
    };
  });
  if (!data) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { found, input, completion, narratives, logo } = data;
  const pdf = await renderToBuffer(
    <ReadinessPdf
      firmName={found.orgName}
      logo={logo ? { data: logo.logo, format: logo.logoType === "image/png" ? "png" : "jpg" } : null}
      title={found.instrument.name}
      clientName={found.clientName}
      engagementName={found.engagementName}
      targetSystem={found.targetSystem}
      anonymous={input.anonymous}
      status={STATUS[found.instrument.status]}
      generatedAt={new Date()}
      invited={completion.reduce((a, c) => a + c.invited, 0)}
      completed={completion.reduce((a, c) => a + c.completed, 0)}
      report={buildReport(input)}
      narratives={narratives}
    />,
  );
  const filename = `${found.clientName} ${found.instrument.name}`.replace(/[^\w\- ]+/g, "").replace(/\s+/g, "-").toLowerCase();
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename || "readiness-report"}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
