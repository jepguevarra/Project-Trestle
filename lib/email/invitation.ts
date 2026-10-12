import type { Role } from "@/lib/auth/roles";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { Email } from "./index";

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function invitationEmail(opts: {
  to: string;
  orgName: string;
  role: Role;
  inviterEmail: string | null;
  acceptUrl: string;
}): Email {
  const who = opts.inviterEmail ?? "A colleague";
  const role = ROLE_LABELS[opts.role];
  const subject = `You're invited to ${opts.orgName} on Trestle`;
  const text = [
    `${who} invited you to join ${opts.orgName} on Trestle as ${role}.`,
    "",
    `Accept the invitation: ${opts.acceptUrl}`,
    "",
    "The link expires in 7 days. If you weren't expecting this, you can ignore it.",
  ].join("\n");
  const html = `<p>${escape(who)} invited you to join <strong>${escape(opts.orgName)}</strong> on Trestle as ${escape(role)}.</p>
<p><a href="${escape(opts.acceptUrl)}">Accept the invitation</a></p>
<p style="color:#666">The link expires in 7 days. If you weren't expecting this, you can ignore it.</p>`;
  return { to: opts.to, subject, text, html };
}
