import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** A styled native select: accessible and phone-friendly by default. */
export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-9 rounded-md border border-input bg-card px-2 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
