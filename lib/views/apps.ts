import type { OcmStage } from "./engagement";

export type AppDef = {
  key: string;
  label: string;
  /** Which home-menu heading it sits under. */
  section: "engagement" | OcmStage;
  /** Route segment under /engagements/[id]; null until the app is built. */
  route: string | null;
  /** The plan phase that builds it, shown on its disabled tile. */
  deliveredBy: string;
};

/**
 * Every app an engagement will have (OCM-MODULE.md §7.1), in home-menu order. An app with no route
 * renders as a disabled tile naming the phase that delivers it. Flip `route` when a phase ships.
 */
export const ENGAGEMENT_APPS: AppDef[] = [
  { key: "overview", label: "Overview", section: "engagement", route: "overview", deliveredBy: "02b" },
  { key: "checklist", label: "Checklist", section: "engagement", route: null, deliveredBy: "14" },
  { key: "settings", label: "Settings", section: "engagement", route: "settings", deliveredBy: "02b" },

  { key: "readiness", label: "Readiness", section: "assess", route: "readiness", deliveredBy: "03–05" },
  { key: "audiences", label: "Audiences", section: "assess", route: null, deliveredBy: "07" },
  { key: "stakeholders", label: "Stakeholders", section: "assess", route: null, deliveredBy: "07" },
  { key: "impacts", label: "Impacts", section: "assess", route: null, deliveredBy: "08" },
  { key: "sources", label: "Sources", section: "assess", route: null, deliveredBy: "06" },
  { key: "processes", label: "Processes", section: "assess", route: null, deliveredBy: "09" },
  { key: "requirements", label: "Requirements", section: "assess", route: null, deliveredBy: "10" },
  { key: "data", label: "Data", section: "assess", route: null, deliveredBy: "11" },

  { key: "resistance", label: "Resistance", section: "develop", route: null, deliveredBy: "15" },
  { key: "communications", label: "Communications", section: "develop", route: null, deliveredBy: "16" },
  { key: "champions", label: "Champions", section: "develop", route: null, deliveredBy: "17" },
  { key: "training", label: "Training", section: "develop", route: null, deliveredBy: "17" },

  { key: "events", label: "Events", section: "deploy", route: null, deliveredBy: "16" },
  { key: "go-live", label: "Go-Live", section: "deploy", route: null, deliveredBy: "18" },

  { key: "status-reports", label: "Status reports", section: "normalize", route: null, deliveredBy: "19" },
  { key: "transition", label: "Transition", section: "exit", route: null, deliveredBy: "19" },
];

export function appByRoute(route: string): AppDef | undefined {
  return ENGAGEMENT_APPS.find((a) => a.route === route);
}
