"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { appByRoute } from "@/lib/views/apps";

/** The current app's name in the navbar, read from the route segment under /engagements/[id]. */
export function CurrentAppLabel() {
  const segment = useSelectedLayoutSegment();
  const app = segment ? appByRoute(segment) : undefined;
  return app ? <span className="text-muted-foreground"> · {app.label}</span> : null;
}
