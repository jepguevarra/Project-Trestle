CREATE TABLE "org_branding" (
	"org_id" uuid PRIMARY KEY NOT NULL,
	"logo" "bytea" NOT NULL,
	"logo_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_narrative" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"engagement_id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"key" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_narrative_instrument_id_key_key" UNIQUE("instrument_id","key")
);
--> statement-breakpoint
CREATE TABLE "response_theme" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"engagement_id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"response_id" uuid NOT NULL,
	"theme" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "response_theme_response_id_theme_key" UNIQUE("response_id","theme")
);
--> statement-breakpoint
ALTER TABLE "response" ADD COLUMN "duration_seconds" integer;--> statement-breakpoint
ALTER TABLE "response" ADD CONSTRAINT "response_id_instrument_id_key" UNIQUE("id","instrument_id");--> statement-breakpoint
ALTER TABLE "org_branding" ADD CONSTRAINT "org_branding_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_narrative" ADD CONSTRAINT "report_narrative_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_narrative" ADD CONSTRAINT "report_narrative_instrument_fk" FOREIGN KEY ("instrument_id","engagement_id","org_id") REFERENCES "public"."instrument"("id","engagement_id","org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response_theme" ADD CONSTRAINT "response_theme_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response_theme" ADD CONSTRAINT "response_theme_instrument_fk" FOREIGN KEY ("instrument_id","engagement_id","org_id") REFERENCES "public"."instrument"("id","engagement_id","org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response_theme" ADD CONSTRAINT "response_theme_response_fk" FOREIGN KEY ("response_id","instrument_id") REFERENCES "public"."response"("id","instrument_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "report_narrative_org_id_idx" ON "report_narrative" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "report_narrative_instrument_id_engagement_id_org_id_idx" ON "report_narrative" USING btree ("instrument_id","engagement_id","org_id");--> statement-breakpoint
CREATE INDEX "response_theme_org_id_idx" ON "response_theme" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "response_theme_instrument_id_engagement_id_org_id_idx" ON "response_theme" USING btree ("instrument_id","engagement_id","org_id");--> statement-breakpoint
--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Hand-written below this line: submit with duration, guards, grants and RLS.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

-- The submit function from 0004, now also recording how long the respondent took.
CREATE OR REPLACE FUNCTION private.submit_survey() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  r public.respondent;
  i public.instrument;
  submission uuid := gen_random_uuid();
  anonymous boolean;
  duration integer;
BEGIN
  SELECT * INTO r FROM public.respondent
  WHERE id = private.survey_respondent_id() AND instrument_id = private.survey_instrument_id()
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown respondent' USING ERRCODE = 'TR404';
  END IF;
  SELECT * INTO i FROM public.instrument WHERE id = r.instrument_id;
  IF i.status <> 'open' OR (i.closes_at IS NOT NULL AND now() > i.closes_at) THEN
    RAISE EXCEPTION 'the survey is closed' USING ERRCODE = 'TR410';
  END IF;
  IF r.completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'already submitted' USING ERRCODE = 'TR411';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.question q
    WHERE q.instrument_id = i.id AND q.is_required
      AND NOT EXISTS (
        SELECT 1 FROM public.response_draft d
        WHERE d.respondent_id = r.id AND d.question_id = q.id
          -- The same validity rules as the insert below, so an invalid answer counts as none.
          AND (
            (q.type = 'likert_5' AND d.value_numeric IN (1, 2, 3, 4, 5))
            OR (q.type = 'likert_7' AND d.value_numeric IN (1, 2, 3, 4, 5, 6, 7))
            OR (q.type = 'numeric' AND d.value_numeric IS NOT NULL)
            OR (q.type = 'open_text' AND nullif(btrim(d.value_text), '') IS NOT NULL)
            OR ((q.type = 'multi_choice' OR (q.type = 'single_choice' AND cardinality(d.option_ids) = 1))
                AND EXISTS (SELECT 1 FROM public.question_option o WHERE o.question_id = q.id AND o.id = ANY (d.option_ids)))
          )
      )
  ) THEN
    RAISE EXCEPTION 'a required question is unanswered' USING ERRCODE = 'TR412';
  END IF;

  anonymous := i.anonymity = 'anonymous';
  -- From the first saved answer to now. Feeds the speeding flag; it says how long, never when.
  SELECT round(extract(epoch FROM now() - min(d.created_at)))::integer INTO duration
  FROM public.response_draft d WHERE d.respondent_id = r.id;

  INSERT INTO public.response (org_id, engagement_id, instrument_id, question_id, option_id, submission_id,
    respondent_id, department, role_title, seniority, value_numeric, value_text, answered_at, duration_seconds)
  -- Agreement scales, numbers and open text: one row per question, values checked against the type.
  SELECT i.org_id, i.engagement_id, i.id, q.id, NULL, submission,
    CASE WHEN anonymous THEN NULL ELSE r.id END, r.department, r.role_title, r.seniority,
    CASE WHEN q.type IN ('likert_5', 'likert_7', 'numeric') THEN d.value_numeric END,
    CASE WHEN q.type = 'open_text' THEN nullif(btrim(d.value_text), '') END,
    CASE WHEN anonymous THEN NULL ELSE d.updated_at END, duration
  FROM public.response_draft d
  JOIN public.question q ON q.id = d.question_id AND q.instrument_id = i.id
  WHERE d.respondent_id = r.id
    AND (
      (q.type = 'likert_5' AND d.value_numeric IN (1, 2, 3, 4, 5))
      OR (q.type = 'likert_7' AND d.value_numeric IN (1, 2, 3, 4, 5, 6, 7))
      OR (q.type = 'numeric' AND d.value_numeric IS NOT NULL)
      OR (q.type = 'open_text' AND nullif(btrim(d.value_text), '') IS NOT NULL)
    )
  UNION ALL
  -- Choice questions: one row per selected option, carrying the option's score. Options that do
  -- not belong to the question are dropped by the join.
  SELECT i.org_id, i.engagement_id, i.id, q.id, o.id, submission,
    CASE WHEN anonymous THEN NULL ELSE r.id END, r.department, r.role_title, r.seniority,
    o.value, NULL,
    CASE WHEN anonymous THEN NULL ELSE d.updated_at END, duration
  FROM public.response_draft d
  JOIN public.question q ON q.id = d.question_id AND q.instrument_id = i.id
  JOIN public.question_option o ON o.question_id = q.id AND o.id = ANY (d.option_ids)
  WHERE d.respondent_id = r.id
    AND (q.type = 'multi_choice' OR (q.type = 'single_choice' AND cardinality(d.option_ids) = 1));

  UPDATE public.respondent SET completed_at = now() WHERE id = r.id;
  DELETE FROM public.response_draft WHERE respondent_id = r.id;
  RETURN submission;
END
$$;--> statement-breakpoint

CREATE TRIGGER report_narrative_set_updated_at BEFORE UPDATE ON public.report_narrative
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();--> statement-breakpoint
CREATE TRIGGER org_branding_set_updated_at BEFORE UPDATE ON public.org_branding
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();--> statement-breakpoint
ALTER TABLE public.org_branding ADD CONSTRAINT org_branding_logo_size_check CHECK (octet_length(logo) <= 524288);--> statement-breakpoint
ALTER TABLE public.report_narrative ADD CONSTRAINT report_narrative_body_check CHECK (char_length(body) <= 20000);--> statement-breakpoint
ALTER TABLE public.response_theme ADD CONSTRAINT response_theme_theme_check CHECK (char_length(theme) BETWEEN 1 AND 60);--> statement-breakpoint

-- ─── Grants ───────────────────────────────────────────────────────────────────────────────────
REVOKE ALL ON public.report_narrative, public.response_theme, public.org_branding FROM anon;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_narrative, public.response_theme, public.org_branding TO authenticated;--> statement-breakpoint

-- ─── Row Level Security ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.report_narrative ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.response_theme ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.org_branding ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- ─── Faster engagement-scoped reads ───────────────────────────────────────────────────────────
-- `private.can_read_engagement(org_id, engagement_id)` is correlated: Postgres calls it once per row,
-- and once per row *per join loop*, so joining 800 answers to their questions cost 2.7 seconds.
-- The set of engagements a user may read is the same for every row of a query, so policies now ask
-- `engagement_id IN (SELECT private.readable_engagement_ids())`: an uncorrelated subquery that runs
-- once and is probed as a hash. Same rule as can_read_engagement: an admin of the org, or a member
-- assigned to the engagement.
CREATE FUNCTION private.readable_engagement_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT e.id FROM public.engagement e
  WHERE e.org_id IN (SELECT private.user_org_ids())
    AND (private.has_org_role(e.org_id, 'admin') OR e.id IN (SELECT private.assigned_engagement_ids()))
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION private.readable_engagement_ids() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION private.readable_engagement_ids() TO authenticated;--> statement-breakpoint
DROP POLICY scoped_select ON public.instrument;--> statement-breakpoint
CREATE POLICY scoped_select ON public.instrument FOR SELECT TO authenticated
  USING (org_id IN (SELECT private.user_org_ids()) AND engagement_id IN (SELECT private.readable_engagement_ids()));--> statement-breakpoint
DROP POLICY scoped_select ON public.dimension;--> statement-breakpoint
CREATE POLICY scoped_select ON public.dimension FOR SELECT TO authenticated
  USING (org_id IN (SELECT private.user_org_ids()) AND engagement_id IN (SELECT private.readable_engagement_ids()));--> statement-breakpoint
DROP POLICY scoped_select ON public.section;--> statement-breakpoint
CREATE POLICY scoped_select ON public.section FOR SELECT TO authenticated
  USING (org_id IN (SELECT private.user_org_ids()) AND engagement_id IN (SELECT private.readable_engagement_ids()));--> statement-breakpoint
DROP POLICY scoped_select ON public.question;--> statement-breakpoint
CREATE POLICY scoped_select ON public.question FOR SELECT TO authenticated
  USING (org_id IN (SELECT private.user_org_ids()) AND engagement_id IN (SELECT private.readable_engagement_ids()));--> statement-breakpoint
DROP POLICY scoped_select ON public.question_option;--> statement-breakpoint
CREATE POLICY scoped_select ON public.question_option FOR SELECT TO authenticated
  USING (org_id IN (SELECT private.user_org_ids()) AND engagement_id IN (SELECT private.readable_engagement_ids()));--> statement-breakpoint
DROP POLICY scoped_select ON public.respondent;--> statement-breakpoint
CREATE POLICY scoped_select ON public.respondent FOR SELECT TO authenticated
  USING (org_id IN (SELECT private.user_org_ids()) AND engagement_id IN (SELECT private.readable_engagement_ids()));--> statement-breakpoint
DROP POLICY scoped_select ON public.response;--> statement-breakpoint
CREATE POLICY scoped_select ON public.response FOR SELECT TO authenticated
  USING (org_id IN (SELECT private.user_org_ids()) AND engagement_id IN (SELECT private.readable_engagement_ids()));--> statement-breakpoint

-- Narrative and themes: read with the engagement, written by whoever may edit it.
CREATE POLICY scoped_select ON public.report_narrative FOR SELECT TO authenticated
  USING (org_id IN (SELECT private.user_org_ids()) AND engagement_id IN (SELECT private.readable_engagement_ids()));--> statement-breakpoint
CREATE POLICY editor_write ON public.report_narrative FOR ALL TO authenticated
  USING (private.can_edit_engagement(engagement_id))
  WITH CHECK (private.can_edit_engagement(engagement_id));--> statement-breakpoint
CREATE POLICY scoped_select ON public.response_theme FOR SELECT TO authenticated
  USING (org_id IN (SELECT private.user_org_ids()) AND engagement_id IN (SELECT private.readable_engagement_ids()));--> statement-breakpoint
CREATE POLICY editor_write ON public.response_theme FOR ALL TO authenticated
  USING (private.can_edit_engagement(engagement_id))
  WITH CHECK (private.can_edit_engagement(engagement_id));--> statement-breakpoint

-- The logo: every member sees it (it goes on their exports); admins change it.
CREATE POLICY member_select ON public.org_branding FOR SELECT TO authenticated
  USING (org_id IN (SELECT private.user_org_ids()));--> statement-breakpoint
CREATE POLICY admin_write ON public.org_branding FOR ALL TO authenticated
  USING (private.has_org_role(org_id, 'admin'))
  WITH CHECK (private.has_org_role(org_id, 'admin'));
