import type { ActionState } from "@/lib/auth/action-state";
import { cn } from "@/lib/utils";

export function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={cn("text-sm", state.ok ? "text-success" : "text-destructive")}>
      {state.message}
    </p>
  );
}
