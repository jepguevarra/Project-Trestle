import type { FieldDef } from "@/components/views/record-form";

/** The client form's fields, shared by New and the record form. */
export function clientFields(industries: readonly string[], sizes: { value: string; label: string }[]): FieldDef[] {
  return [
    { name: "name", label: "Name", kind: "text", required: true, placeholder: "Client name, e.g. Harbour Foods" },
    { name: "industry", label: "Industry", kind: "select", options: industries.map((i) => ({ value: i, label: i })) },
    { name: "sizeBand", label: "Size", kind: "select", options: sizes },
    { name: "notes", label: "Notes", kind: "textarea" },
  ];
}
