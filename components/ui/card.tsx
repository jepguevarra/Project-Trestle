import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-md border border-border bg-card p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentProps<"h1">) {
  return <h1 className={cn("text-lg font-semibold", className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("mt-1 text-sm text-muted-foreground", className)} {...props} />;
}
