import { anonymityNotice } from "@/lib/survey/messages";
import type { Email } from "./index";

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const date = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** The invitation, and the reminder that goes only to people who have not answered. */
export function surveyEmail(opts: {
  kind: "invitation" | "reminder";
  to: string;
  name: string | null;
  firmName: string;
  clientName: string;
  targetSystem: string;
  surveyName: string;
  anonymous: boolean;
  closesAt: Date | null;
  url: string;
}): Email {
  const subject =
    opts.kind === "invitation" ? `${opts.clientName}: your view on the move to ${opts.targetSystem}` : `Reminder: ${opts.surveyName}`;
  const lines = [
    opts.name ? `Hello ${opts.name},` : "Hello,",
    "",
    opts.kind === "invitation"
      ? `${opts.clientName} is preparing for ${opts.targetSystem}, and ${opts.firmName} is helping. Before the change, we would like to know how ready you feel for it. The survey takes about ten minutes.`
      : `You have not yet answered "${opts.surveyName}". It takes about ten minutes, and your answers so far are saved.`,
    "",
    anonymityNotice(opts.anonymous),
    "",
    `Open the survey: ${opts.url}`,
    "",
    opts.closesAt ? `The survey closes on ${date(opts.closesAt)}. ` : "",
    "This link is personal to you; please do not forward it.",
  ];
  const text = lines.join("\n").replace(/\n{3,}/g, "\n\n");
  const html = `<p>${escape(lines[0]!)}</p>
<p>${escape(lines[2]!)}</p>
<p>${escape(lines[4]!)}</p>
<p><a href="${escape(opts.url)}">Open the survey</a></p>
<p style="color:#666">${opts.closesAt ? `The survey closes on ${escape(date(opts.closesAt))}. ` : ""}This link is personal to you; please do not forward it.</p>`;
  return { to: opts.to, subject, text, html };
}
