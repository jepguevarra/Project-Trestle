import type { Metadata } from "next";
import { LiveSurvey } from "@/components/survey/live-survey";

// The public survey page: no sign-in, no session, no Supabase client. The page is a shell; the
// survey itself is read and written through /api/public/survey/[token] (DATA-MODEL.md §12).
export const metadata: Metadata = {
  title: "Survey",
  robots: { index: false, follow: false },
  // The link is the respondent's credential: never send it to another site as a referrer.
  referrer: "no-referrer",
};

export default async function SurveyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="mx-auto grid w-full max-w-2xl gap-4 px-4 py-6 sm:py-10">
      <p className="text-sm font-semibold tracking-wide text-muted-foreground">TRESTLE</p>
      <div className="rounded-md border border-border bg-card p-4 sm:p-6">
        <LiveSurvey token={token} />
      </div>
    </main>
  );
}
