import type { TrackingEntry } from "@/lib/db/schema/messages";

export type TrackedField<T> = {
  field: keyof T & string;
  label: string;
  /** Human-readable value for chatter, e.g. an enum label. Defaults to String(value). */
  format?: (value: unknown) => string | null;
};

const show = (v: unknown): string | null => (v === null || v === undefined || v === "" ? null : String(v));

/** The tracked fields that changed between two versions of a record, as chatter entries. */
export function diffTracked<T extends Record<string, unknown>>(
  before: T,
  after: T,
  fields: TrackedField<T>[],
): TrackingEntry[] {
  return fields.flatMap(({ field, label, format }) => {
    const fmt = format ?? show;
    const old = fmt(before[field]);
    const now = fmt(after[field]);
    return old === now ? [] : [{ field, label, old, new: now }];
  });
}
