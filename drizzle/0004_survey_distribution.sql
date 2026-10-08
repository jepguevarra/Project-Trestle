CREATE TYPE "public"."seniority" AS ENUM('frontline', 'supervisor', 'manager', 'executive');--> statement-breakpoint
CREATE TABLE "respondent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"engagement_id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"department" text,
	"role_title" text,
	"seniority" "seniority",
	"invited_at" timestamp with time zone,
	"reminded_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"token_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "respondent_instrument_id_email_key" UNIQUE("instrument_id","email"),
	CONSTRAINT "respondent_id_instrument_id_key" UNIQUE("id","instrument_id"),
	CONSTRAINT "respondent_email_check" CHECK ("respondent"."email" = lower("respondent"."email") and "respondent"."email" like '%_@_%')
);
--> statement-breakpoint
CREATE TABLE "response" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"engagement_id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"option_id" uuid,
	"submission_id" uuid NOT NULL,
	"respondent_id" uuid,
	"department" text,
	"role_title" text,
	"seniority" "seniority",
	"value_numeric" numeric,
	"value_text" text,
	"answered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "response_draft" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"engagement_id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"respondent_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"value_numeric" numeric,
	"value_text" text,
	"option_ids" uuid[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "response_draft_respondent_id_question_id_key" UNIQUE("respondent_id","question_id")
);
--> statement-breakpoint
ALTER TABLE "instrument" ADD COLUMN "token_epoch" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "respondent" ADD CONSTRAINT "respondent_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respondent" ADD CONSTRAINT "respondent_instrument_fk" FOREIGN KEY ("instrument_id","engagement_id","org_id") REFERENCES "public"."instrument"("id","engagement_id","org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response" ADD CONSTRAINT "response_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response" ADD CONSTRAINT "response_instrument_fk" FOREIGN KEY ("instrument_id","engagement_id","org_id") REFERENCES "public"."instrument"("id","engagement_id","org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response" ADD CONSTRAINT "response_question_fk" FOREIGN KEY ("question_id","instrument_id") REFERENCES "public"."question"("id","instrument_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response" ADD CONSTRAINT "response_option_fk" FOREIGN KEY ("option_id") REFERENCES "public"."question_option"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response" ADD CONSTRAINT "response_respondent_fk" FOREIGN KEY ("respondent_id","instrument_id") REFERENCES "public"."respondent"("id","instrument_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response_draft" ADD CONSTRAINT "response_draft_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response_draft" ADD CONSTRAINT "response_draft_instrument_fk" FOREIGN KEY ("instrument_id","engagement_id","org_id") REFERENCES "public"."instrument"("id","engagement_id","org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response_draft" ADD CONSTRAINT "response_draft_respondent_fk" FOREIGN KEY ("respondent_id","instrument_id") REFERENCES "public"."respondent"("id","instrument_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response_draft" ADD CONSTRAINT "response_draft_question_fk" FOREIGN KEY ("question_id","instrument_id") REFERENCES "public"."question"("id","instrument_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "respondent_org_id_idx" ON "respondent" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "respondent_instrument_id_engagement_id_org_id_idx" ON "respondent" USING btree ("instrument_id","engagement_id","org_id");--> statement-breakpoint
CREATE INDEX "response_org_id_idx" ON "response" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "response_instrument_id_question_id_idx" ON "response" USING btree ("instrument_id","question_id");--> statement-breakpoint
CREATE INDEX "response_instrument_id_engagement_id_org_id_idx" ON "response" USING btree ("instrument_id","engagement_id","org_id");--> statement-breakpoint
CREATE INDEX "response_respondent_id_idx" ON "response" USING btree ("respondent_id");--> statement-breakpoint
CREATE INDEX "response_option_id_idx" ON "response" USING btree ("option_id");--> statement-breakpoint
CREATE INDEX "response_draft_org_id_idx" ON "response_draft" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "response_draft_instrument_id_engagement_id_org_id_idx" ON "response_draft" USING btree ("instrument_id","engagement_id","org_id");--> statement-breakpoint
CREATE INDEX "response_draft_question_id_instrument_id_idx" ON "response_draft" USING btree ("question_id","instrument_id");--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Hand-written below this line: the survey role, guards, the submit function, grants and RLS.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

-- ─── The survey role ──────────────────────────────────────────────────────────────────────────
-- The public survey route (app/api/public/survey/[token]) is the only code that acts for someone
-- with no account. Rather than bypass RLS, it switches to this role after verifying the link's
-- signature, with the respondent and instrument from the link set as transaction-local settings.
-- The role's policies then let it see only that instrument's questions and that respondent's own
-- row and draft answers. It cannot read dimensions, weights, other respondents, or any response.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'trestle_survey') THEN
    CREATE ROLE trestle_survey NOLOGIN NOINHERIT;
  END IF;
END
$$;--> statement-breakpoint
GRANT trestle_survey TO CURRENT_USER;--> statement-breakpoint
GRANT USAGE ON SCHEMA public, private TO trestle_survey;--> statement-breakpoint

CREATE FUNCTION private.survey_respondent_id() RETURNS uuid
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT nullif(current_setting('trestle.respondent_id', true), '')::uuid
$$;--> statement-breakpoint
CREATE FUNCTION private.survey_instrument_id() RETURNS uuid
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT nullif(current_setting('trestle.instrument_id', true), '')::uuid
$$;--> statement-breakpoint

-- True while the link's respondent may still save answers: the instrument is open and not past its
-- close date, and they have not submitted.
CREATE FUNCTION private.survey_accepting() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.respondent r JOIN public.instrument i ON i.id = r.instrument_id
    WHERE r.id = private.survey_respondent_id()
      AND i.id = private.survey_instrument_id()
      AND r.completed_at IS NULL
      AND i.status = 'open'
      AND (i.closes_at IS NULL OR now() <= i.closes_at)
  )
$$;--> statement-breakpoint

-- Respondents may be added or edited while the instrument is a draft or open, not once closed.
CREATE FUNCTION private.instrument_accepts_respondents(p_instrument_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.instrument i WHERE i.id = p_instrument_id AND i.status IN ('draft', 'open'))
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION private.survey_respondent_id(), private.survey_instrument_id(), private.survey_accepting(),
  private.instrument_accepts_respondents(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION private.survey_respondent_id(), private.survey_instrument_id(), private.survey_accepting()
  TO trestle_survey;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION private.instrument_accepts_respondents(uuid) TO authenticated;--> statement-breakpoint

-- ─── Submit ───────────────────────────────────────────────────────────────────────────────────
-- The anonymity transaction (DATA-MODEL.md §3), in one function so it cannot be half-done. Copies
-- the respondent's drafts into `response` with their segment attributes, sets completed_at and
-- deletes the drafts. On an anonymous instrument respondent_id and answered_at are never written,
-- so nothing in `response` links an answer to a person or to the moment they completed.
CREATE FUNCTION private.submit_survey() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  r public.respondent;
  i public.instrument;
  submission uuid := gen_random_uuid();
  anonymous boolean;
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

  INSERT INTO public.response (org_id, engagement_id, instrument_id, question_id, option_id, submission_id,
    respondent_id, department, role_title, seniority, value_numeric, value_text, answered_at)
  -- Agreement scales, numbers and open text: one row per question, values checked against the type.
  SELECT i.org_id, i.engagement_id, i.id, q.id, NULL, submission,
    CASE WHEN anonymous THEN NULL ELSE r.id END, r.department, r.role_title, r.seniority,
    CASE WHEN q.type IN ('likert_5', 'likert_7', 'numeric') THEN d.value_numeric END,
    CASE WHEN q.type = 'open_text' THEN nullif(btrim(d.value_text), '') END,
    CASE WHEN anonymous THEN NULL ELSE d.updated_at END
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
    CASE WHEN anonymous THEN NULL ELSE d.updated_at END
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
REVOKE ALL ON FUNCTION private.submit_survey() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION private.submit_survey() TO trestle_survey;--> statement-breakpoint

-- ─── Guards ───────────────────────────────────────────────────────────────────────────────────
-- A respondent never moves to another instrument; completion is set only by submit_survey (never
-- through the API); and correcting an email address revokes the link sent to the old one.
CREATE FUNCTION private.guard_respondent() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.completed_at IS NOT NULL AND current_user = 'authenticated' THEN
      RAISE EXCEPTION 'completion is recorded by the survey' USING ERRCODE = 'TR400';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.org_id <> OLD.org_id OR NEW.engagement_id <> OLD.engagement_id OR NEW.instrument_id <> OLD.instrument_id THEN
    RAISE EXCEPTION 'a respondent cannot move to another instrument' USING ERRCODE = 'TR400';
  END IF;
  IF NEW.completed_at IS DISTINCT FROM OLD.completed_at AND current_user = 'authenticated' THEN
    RAISE EXCEPTION 'completion is recorded by the survey' USING ERRCODE = 'TR400';
  END IF;
  IF NEW.token_version < OLD.token_version THEN
    RAISE EXCEPTION 'a link version only moves forward' USING ERRCODE = 'TR400';
  END IF;
  IF NEW.email <> OLD.email THEN
    NEW.token_version := OLD.token_version + 1;
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER respondent_guard BEFORE INSERT OR UPDATE ON public.respondent
  FOR EACH ROW EXECUTE FUNCTION private.guard_respondent();--> statement-breakpoint
CREATE TRIGGER respondent_set_updated_at BEFORE UPDATE ON public.respondent
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();--> statement-breakpoint
CREATE TRIGGER response_draft_set_updated_at BEFORE UPDATE ON public.response_draft
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();--> statement-breakpoint

-- The instrument guard from 0003, plus: the survey link version only moves forward.
CREATE OR REPLACE FUNCTION private.guard_instrument() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.org_id <> OLD.org_id OR NEW.engagement_id <> OLD.engagement_id THEN
    RAISE EXCEPTION 'an instrument cannot move to another engagement' USING ERRCODE = 'TR400';
  END IF;
  -- Respondents were told whether they are anonymous; that promise cannot change under them.
  IF OLD.status <> 'draft' AND NEW.anonymity <> OLD.anonymity THEN
    RAISE EXCEPTION 'anonymity is fixed once an instrument has opened' USING ERRCODE = 'TR424';
  END IF;
  IF NEW.token_epoch < OLD.token_epoch THEN
    RAISE EXCEPTION 'a link version only moves forward' USING ERRCODE = 'TR400';
  END IF;
  IF NEW.status <> OLD.status THEN
    IF NEW.status = 'draft' THEN
      RAISE EXCEPTION 'an instrument that has been opened cannot go back to draft' USING ERRCODE = 'TR423';
    END IF;
    IF OLD.status = 'draft' AND NEW.status = 'closed' THEN
      RAISE EXCEPTION 'a draft instrument must be opened before it can close' USING ERRCODE = 'TR423';
    END IF;
    IF NEW.status = 'open' AND NOT EXISTS (SELECT 1 FROM public.question q WHERE q.instrument_id = NEW.id) THEN
      RAISE EXCEPTION 'an instrument needs at least one question before it can open' USING ERRCODE = 'TR422';
    END IF;
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint

-- ─── Grants ───────────────────────────────────────────────────────────────────────────────────
REVOKE ALL ON public.respondent, public.response, public.response_draft FROM anon, authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.respondent TO authenticated;--> statement-breakpoint
-- Answers are written only by submit_survey; signed-in users read them, never write them.
GRANT SELECT ON public.response TO authenticated;--> statement-breakpoint
-- Drafts are not granted to signed-in users at all: unsubmitted answers are the respondent's own.

-- Column grants: the survey role can read what a respondent is shown and nothing about scoring
-- (no dimension, weight, reverse flag, item source or option score) or about other people.
GRANT SELECT (id, org_id, engagement_id, name, anonymity, status, opens_at, closes_at, token_epoch)
  ON public.instrument TO trestle_survey;--> statement-breakpoint
GRANT SELECT (id, instrument_id, title, description, sort_order) ON public.section TO trestle_survey;--> statement-breakpoint
GRANT SELECT (id, instrument_id, section_id, text, help_text, type, is_required, sort_order, created_at)
  ON public.question TO trestle_survey;--> statement-breakpoint
GRANT SELECT (id, instrument_id, question_id, label, sort_order) ON public.question_option TO trestle_survey;--> statement-breakpoint
GRANT SELECT (id, org_id, engagement_id, instrument_id, name, completed_at, token_version)
  ON public.respondent TO trestle_survey;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.response_draft TO trestle_survey;--> statement-breakpoint

-- ─── Row Level Security ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.respondent ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.response ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.response_draft ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- Respondents: read with the engagement; managed by its editors while the instrument is a draft or
-- open; deleted only before they have submitted.
CREATE POLICY scoped_select ON public.respondent FOR SELECT TO authenticated
  USING (private.can_read_engagement(org_id, engagement_id));--> statement-breakpoint
CREATE POLICY editor_insert ON public.respondent FOR INSERT TO authenticated
  WITH CHECK (private.can_edit_engagement(engagement_id) AND private.instrument_accepts_respondents(instrument_id));--> statement-breakpoint
CREATE POLICY editor_update ON public.respondent FOR UPDATE TO authenticated
  USING (private.can_edit_engagement(engagement_id) AND private.instrument_accepts_respondents(instrument_id))
  WITH CHECK (private.can_edit_engagement(engagement_id) AND private.instrument_accepts_respondents(instrument_id));--> statement-breakpoint
CREATE POLICY editor_delete_unsubmitted ON public.respondent FOR DELETE TO authenticated
  USING (completed_at IS NULL AND private.can_edit_engagement(engagement_id));--> statement-breakpoint

CREATE POLICY scoped_select ON public.response FOR SELECT TO authenticated
  USING (private.can_read_engagement(org_id, engagement_id));--> statement-breakpoint

-- The survey role: only what the link names.
CREATE POLICY survey_self ON public.respondent FOR SELECT TO trestle_survey
  USING (id = private.survey_respondent_id() AND instrument_id = private.survey_instrument_id());--> statement-breakpoint
CREATE POLICY survey_own_instrument ON public.instrument FOR SELECT TO trestle_survey
  USING (id = private.survey_instrument_id());--> statement-breakpoint
CREATE POLICY survey_own_instrument ON public.section FOR SELECT TO trestle_survey
  USING (instrument_id = private.survey_instrument_id());--> statement-breakpoint
CREATE POLICY survey_own_instrument ON public.question FOR SELECT TO trestle_survey
  USING (instrument_id = private.survey_instrument_id());--> statement-breakpoint
CREATE POLICY survey_own_instrument ON public.question_option FOR SELECT TO trestle_survey
  USING (instrument_id = private.survey_instrument_id());--> statement-breakpoint
CREATE POLICY survey_own_drafts ON public.response_draft FOR ALL TO trestle_survey
  USING (respondent_id = private.survey_respondent_id() AND instrument_id = private.survey_instrument_id())
  WITH CHECK (
    respondent_id = private.survey_respondent_id() AND instrument_id = private.survey_instrument_id()
    AND private.survey_accepting()
  );
