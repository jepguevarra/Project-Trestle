import type { ReactNode } from "react";
import { Table, Td, Th } from "@/components/ui/table";

/** A one-to-many list inside a form (OCM-MODULE.md §7.3), with an optional row action and add row. */
export function InlineList({
  columns,
  rows,
  rowAction,
  add,
  emptyText,
}: {
  columns: { key: string; label: string; numeric?: boolean }[];
  rows: { id: string; cells: Record<string, ReactNode> }[];
  rowAction?: (rowId: string) => ReactNode;
  add?: ReactNode;
  emptyText: string;
}) {
  return (
    <div className="grid gap-3">
      {rows.length ? (
        <Table>
          <thead>
            <tr>
              {columns.map((c) => (
                <Th key={c.key} numeric={c.numeric}>
                  {c.label}
                </Th>
              ))}
              {rowAction ? (
                <Th className="w-0">
                  <span className="sr-only">Actions</span>
                </Th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                {columns.map((c) => (
                  <Td key={c.key} numeric={c.numeric}>
                    {r.cells[c.key]}
                  </Td>
                ))}
                {rowAction ? <Td>{rowAction(r.id)}</Td> : null}
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      )}
      {add}
    </div>
  );
}
