import type { EngagementType } from "@/lib/validation/engagements";
import { definitionSchema, type InstrumentDefinition } from "./definition";

/**
 * The shipped readiness instruments (phase 03): one generic default and one per engagement type,
 * with the six dimensions from PRD.md. Same dimensions and constructs; the wording names the
 * change the respondent is actually facing (POSITIONING.md §4.2).
 *
 * The items are Trestle's own wording. Each operationalises a construct from the readiness
 * literature in RESEARCH.md §2 (Armenakis et al. 1993; Holt et al. 2007; Weiner 2009; Shea et al.
 * 2014) and the ERP critical-success-factor studies (§1.2). No published item text is reproduced.
 * They are drafts until reviewed: see docs/READINESS-INSTRUMENT.md.
 *
 * Bump TEMPLATE_VERSION whenever wording changes; instruments already created keep their copy.
 */
export const TEMPLATE_VERSION = 1;

type Wording = {
  /** "the new system", "the move to the new platform"… used mid-sentence. */
  change: string;
  /** What people will work in afterwards. */
  system: string;
  /** One item that only makes sense for this type of change, and the dimension it scores into. */
  specific?: { dimension: string; text: string; source: string };
};

const WORDING: Record<"default" | EngagementType, Wording> = {
  default: { change: "the new system", system: "the new system" },
  packaged_software: {
    change: "the new system",
    system: "the new system",
    specific: {
      dimension: "awareness",
      text: "I understand that some of the way we work will change to fit how the new system works, rather than the system changing to fit us.",
      source: "Appropriateness (Armenakis et al. 1993); business process change as an ERP success factor (Somers & Nelson 2001)",
    },
  },
  custom_build: {
    change: "the new system being built for us",
    system: "the new system",
    specific: {
      dimension: "leadership",
      text: "People who do my kind of work have had a real say in what the new system will do.",
      source: "Participation as a source of change commitment (Armenakis et al. 1993)",
    },
  },
  platform_migration: {
    change: "the move to the new platform",
    system: "the new platform",
    specific: {
      dimension: "capability",
      text: "I trust that the records and history I rely on will come across to the new platform correctly.",
      source: "Data accuracy and migration readiness as an ERP success factor (Somers & Nelson 2001; Ngai et al. 2008)",
    },
  },
  automation: {
    change: "the automation of parts of our work",
    system: "the automated process",
    specific: {
      dimension: "awareness",
      text: "I understand which parts of my work will be automated and which will stay with me.",
      source: "Discrepancy and appropriateness (Armenakis et al. 1993)",
    },
  },
  digitalisation: {
    change: "moving our paper and spreadsheet work onto a system",
    system: "the new system",
    specific: {
      dimension: "capability",
      text: "I am comfortable doing on a computer or tablet the work I now do on paper or in spreadsheets.",
      source: "Change-specific efficacy (Holt et al. 2007; Shea et al. 2014)",
    },
  },
};

const DIMENSIONS = [
  { key: "leadership", name: "Leadership & Sponsorship", weight: 1 },
  { key: "awareness", name: "Awareness & Understanding", weight: 1 },
  { key: "capability", name: "Capability & Skills", weight: 1 },
  { key: "culture", name: "Culture & History of Change", weight: 1 },
  { key: "resources", name: "Resources & Capacity", weight: 1 },
  { key: "communication", name: "Communication", weight: 1 },
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function build(w: Wording): InstrumentDefinition {
  const { change, system } = w;
  const likert = (dimension: string, text: string, source: string, reverse = false) => ({
    type: "likert_5" as const,
    dimension,
    text,
    source,
    reverse,
    weight: 1,
    required: true,
  });

  const sections: InstrumentDefinition["sections"] = [
    {
      title: "Why we are changing",
      description: `These questions are about ${change} and the reasons for it.`,
      questions: [
        likert("awareness", `I understand why the organisation is going ahead with ${change}.`, "Discrepancy (Armenakis et al. 1993)"),
        likert("awareness", "The way we work today has real problems that need fixing.", "Discrepancy (Armenakis et al. 1993)"),
        likert("awareness", `${cap(change)} is the right way to deal with those problems.`, "Appropriateness (Armenakis et al. 1993; Holt et al. 2007)"),
        likert("awareness", `I am not sure what ${change} is supposed to achieve.`, "Appropriateness, reverse-worded (Holt et al. 2007)", true),
      ],
    },
    {
      title: "Leadership",
      description: "These questions are about how senior people and your own manager are handling the change.",
      questions: [
        likert("leadership", `Senior leaders are visibly committed to ${change}.`, "Principal support (Armenakis et al. 1993); management support (Holt et al. 2007)"),
        likert("leadership", `My manager has explained what ${change} means for our team.`, "Principal support (Armenakis et al. 1993)"),
        likert("leadership", "Leaders will give this change the time and people it needs.", "Change commitment (Weiner 2009; Shea et al. 2014)"),
        likert("leadership", "Leaders say this change matters, but what they do suggests otherwise.", "Management support, reverse-worded (Holt et al. 2007)", true),
      ],
    },
    {
      title: "Your skills",
      description: `These questions are about how ready you feel to work with ${system}.`,
      questions: [
        likert("capability", `I am confident I can learn to do my job using ${system}.`, "Change-specific efficacy (Holt et al. 2007)"),
        likert("capability", `My team will have the skills it needs for ${system} by the time we start using it.`, "Change efficacy (Weiner 2009; Shea et al. 2014)"),
        likert("capability", "When we have had to learn new tools before, we managed it well.", "Change efficacy (Shea et al. 2014)"),
        likert("capability", `I worry I will not keep up once ${change} goes live.`, "Change-specific efficacy, reverse-worded (Holt et al. 2007)", true),
      ],
    },
    {
      title: "How change goes here",
      description: "These questions are about how changes in this organisation usually turn out.",
      questions: [
        likert("culture", "Past changes in this organisation were generally well managed.", "History of change as context (Armenakis et al. 1993)"),
        likert("culture", "People here are willing to try new ways of working.", "Change culture as an ERP success factor (Somers & Nelson 2001)"),
        likert("culture", "Changes here tend to be announced with energy and then quietly dropped.", "History of change, reverse-worded (Armenakis et al. 1993)", true),
        likert("culture", "When something goes wrong in a change, we learn from it rather than look for someone to blame.", "Contextual factors in readiness (Weiner 2009)"),
      ],
    },
    {
      title: "Time and support",
      description: "These questions are about whether you will have the time and help you need.",
      questions: [
        likert("resources", `I will have enough time to learn ${system} alongside my normal work.`, "Resource availability in change efficacy (Weiner 2009)"),
        likert("resources", "My team will have enough people during the switch to keep the work going.", "Resource availability in change efficacy (Weiner 2009)"),
        likert("resources", `Help will be there when we start using ${system}: training, someone to ask, a way to report problems.`, "User training and support as ERP success factors (Somers & Nelson 2001)"),
        likert("resources", "We already have too many changes going on at the same time.", "Change saturation (Panorama Consulting Group 2026), reverse-worded", true),
      ],
    },
    {
      title: "Information",
      description: `These questions are about what you hear about ${change}.`,
      questions: [
        likert("communication", `I get clear information about ${change} and when it will happen.`, "Communication as an ERP success factor (Somers & Nelson 2001)"),
        likert("communication", `I know where to take my questions about ${change}.`, "The change message (Armenakis et al. 1993)"),
        likert("communication", "I hear about changes that affect my work before they happen, not after.", "The change message (Armenakis et al. 1993)"),
        likert("communication", `What I hear about ${change} depends on who I ask.`, "Message consistency, reverse-worded (Armenakis et al. 1993)", true),
      ],
    },
  ];

  if (w.specific) {
    const s = sections.find((x) => x.questions.some((q) => q.dimension === w.specific!.dimension))!;
    s.questions.push(likert(w.specific.dimension, w.specific.text, w.specific.source));
  }

  sections.push({
    title: "In your own words",
    description: "Optional. Your answers are read by the consultants running this work.",
    questions: [
      { type: "open_text", text: `What concerns you most about ${change}?`, required: false, reverse: false, weight: 1 },
      { type: "open_text", text: "What would help you most to be ready?", required: false, reverse: false, weight: 1 },
    ],
  });

  return definitionSchema.parse({ dimensions: DIMENSIONS, sections });
}

export type SystemTemplate = {
  name: string;
  engagementType: EngagementType | null;
  definition: InstrumentDefinition;
  /** For the review document: how the change is named, and the type's own item. */
  wording: Wording;
};

const LABEL: Record<EngagementType, string> = {
  packaged_software: "packaged software",
  custom_build: "custom build",
  platform_migration: "platform migration",
  automation: "automation",
  digitalisation: "digitalisation",
};

export const READINESS_TEMPLATES: SystemTemplate[] = [
  { name: "Readiness assessment", engagementType: null, definition: build(WORDING.default), wording: WORDING.default },
  ...(Object.keys(LABEL) as EngagementType[]).map((t) => ({
    name: `Readiness assessment: ${LABEL[t]}`,
    engagementType: t,
    definition: build(WORDING[t]),
    wording: WORDING[t],
  })),
];
