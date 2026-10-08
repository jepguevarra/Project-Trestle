import "server-only";
import { Resend } from "resend";
import { env } from "@/lib/env";

export type Email = { to: string; subject: string; text: string; html: string };

let resend: Resend | undefined;

/** Sends through Resend, or prints to the server log when EMAIL_DELIVERY=console (never in production). */
export async function sendEmail(message: Email): Promise<void> {
  if (env.EMAIL_DELIVERY === "console") {
    console.info(`\n[email] to=${message.to} subject=${JSON.stringify(message.subject)}\n${message.text}\n`);
    return;
  }
  resend ??= new Resend(env.RESEND_API_KEY);
  const { error } = await resend.emails.send({ from: env.EMAIL_FROM, ...message });
  if (error) throw new Error(`Email delivery failed: ${error.message}`);
}
