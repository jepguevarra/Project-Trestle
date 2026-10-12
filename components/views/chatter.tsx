import type { ActionState } from "@/lib/auth/action-state";
import type { ChatterMessage } from "@/lib/db/queries/messages";
import { LogNoteForm } from "./log-note-form";

const when = (d: Date) =>
  d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) +
  " UTC";

/**
 * Chatter (OCM-MODULE.md §7.6): log a note, and the record's history of notes and tracked field
 * changes, newest first. "Schedule task" arrives with phase 14.
 */
export function Chatter({
  messages,
  noteAction,
  hidden,
}: {
  messages: ChatterMessage[];
  /** Absent when the user cannot write on this record. */
  noteAction?: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  hidden?: Record<string, string>;
}) {
  return (
    <div className="grid content-start gap-4">
      {noteAction ? <LogNoteForm action={noteAction} hidden={hidden} /> : null}
      <section aria-label="History" className="grid gap-3">
        <h2 className="text-sm font-semibold">History</h2>
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes or changes yet.</p>
        ) : (
          <ol className="grid gap-3">
            {messages.map((m) => (
              <li key={m.id} className="grid gap-1 border-b border-border pb-3 text-sm last:border-b-0">
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{m.authorEmail ?? "Former member"}</span> · {when(m.createdAt)}
                </p>
                {m.kind === "tracking" ? (
                  <ul className="grid gap-0.5" aria-label="Changes">
                    {m.tracking?.map((t) => (
                      <li key={t.field}>
                        {t.label}: <span className="text-muted-foreground">{t.old ?? "empty"}</span> → {t.new ?? "empty"}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="whitespace-pre-wrap">{m.body}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
