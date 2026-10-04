import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Dense data table: left-aligned text, right-aligned numbers (pass `numeric`), 1px row rules,
// no zebra striping.

export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-card">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function Th({ className, numeric, ...props }: ComponentProps<"th"> & { numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-border px-3 py-2 text-left font-semibold whitespace-nowrap text-muted-foreground",
        numeric && "text-right",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, numeric, ...props }: ComponentProps<"td"> & { numeric?: boolean }) {
  return (
    <td
      className={cn("border-b border-border px-3 py-2 align-top", numeric && "text-right tabular-nums", className)}
      {...props}
    />
  );
}
