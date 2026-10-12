CREATE TYPE "public"."instrument_anonymity" AS ENUM('identified', 'anonymous');--> statement-breakpoint
CREATE TYPE "public"."instrument_kind" AS ENUM('readiness', 'sponsor', 'pulse', 'go_live_adoption', 'post_go_live_adoption', 'training_feedback', 'champion', 'coaching', 'communication_feedback', 'custom');--> statement-breakpoint
CREATE TYPE "public"."instrument_status" AS ENUM('draft', 'open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('likert_5', 'likert_7', 'single_choice', 'multi_choice', 'open_text', 'numeric');--> statement-breakpoint
CREATE TABLE "dimension" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"engagement_id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"name" text NOT NULL,
	"weight" numeric DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dimension_instrument_id_name_key" UNIQUE("instrument_id","name"),
	CONSTRAINT "dimension_id_instrument_id_key" UNIQUE("id","instrument_id"),
	CONSTRAINT "dimension_weight_check" CHECK ("dimension"."weight" > 0)
);
--> statement-breakpoint
CREATE TABLE "instrument" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"engagement_id" uuid NOT NULL,
	"template_id" uuid,
	"name" text NOT NULL,
	"kind" "instrument_kind" DEFAULT 'readiness' NOT NULL,
	"wave" smallint DEFAULT 1 NOT NULL,
	"wave_label" text,
	"anonymity" "instrument_anonymity" DEFAULT 'anonymous' NOT NULL,
	"opens_at" timestamp with time zone,
	"closes_at" timestamp with time zone,
	"status" "instrument_status" DEFAULT 'draft' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instrument_id_engagement_id_org_id_key" UNIQUE("id","engagement_id","org_id"),
	CONSTRAINT "instrument_wave_check" CHECK ("instrument"."wave" >= 1),
	CONSTRAINT "instrument_window_check" CHECK ("instrument"."closes_at" is null or "instrument"."opens_at" is null or "instrument"."closes_at" > "instrument"."opens_at")
);
--> statement-breakpoint
CREATE TABLE "instrument_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"name" text NOT NULL,
	"kind" "instrument_kind" DEFAULT 'readiness' NOT NULL,
	"engagement_type" "engagement_type",
	"version" integer DEFAULT 1 NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"definition" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instrument_template_system_check" CHECK ("instrument_template"."is_system" = ("instrument_template"."org_id" is null))
);
--> statement-breakpoint
CREATE TABLE "question" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"engagement_id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"section_id" uuid NOT NULL,
	"dimension_id" uuid,
	"text" text NOT NULL,
	"help_text" text,
	"type" "question_type" NOT NULL,
	"weight" numeric DEFAULT 1 NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"is_reverse_scored" boolean DEFAULT false NOT NULL,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_id_instrument_id_key" UNIQUE("id","instrument_id"),
	CONSTRAINT "question_weight_check" CHECK ("question"."weight" > 0),
	CONSTRAINT "question_dimension_check" CHECK ("question"."type" in ('open_text', 'numeric') or "question"."dimension_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "question_option" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"engagement_id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"question_id" uuid NOT NULL,
	"label" text NOT NULL,
	"value" numeric NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "section" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"engagement_id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "section_id_instrument_id_key" UNIQUE("id","instrument_id")
);
--> statement-breakpoint
ALTER TABLE "record_message" DROP CONSTRAINT "record_message_res_type_check";--> statement-breakpoint
ALTER TABLE "dimension" ADD CONSTRAINT "dimension_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dimension" ADD CONSTRAINT "dimension_instrument_fk" FOREIGN KEY ("instrument_id","engagement_id","org_id") REFERENCES "public"."instrument"("id","engagement_id","org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument" ADD CONSTRAINT "instrument_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument" ADD CONSTRAINT "instrument_template_id_instrument_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."instrument_template"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument" ADD CONSTRAINT "instrument_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument" ADD CONSTRAINT "instrument_engagement_fk" FOREIGN KEY ("engagement_id","org_id") REFERENCES "public"."engagement"("id","org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument_template" ADD CONSTRAINT "instrument_template_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_instrument_fk" FOREIGN KEY ("instrument_id","engagement_id","org_id") REFERENCES "public"."instrument"("id","engagement_id","org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_section_fk" FOREIGN KEY ("section_id","instrument_id") REFERENCES "public"."section"("id","instrument_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_dimension_fk" FOREIGN KEY ("dimension_id","instrument_id") REFERENCES "public"."dimension"("id","instrument_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_option" ADD CONSTRAINT "question_option_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_option" ADD CONSTRAINT "question_option_instrument_fk" FOREIGN KEY ("instrument_id","engagement_id","org_id") REFERENCES "public"."instrument"("id","engagement_id","org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_option" ADD CONSTRAINT "question_option_question_fk" FOREIGN KEY ("question_id","instrument_id") REFERENCES "public"."question"("id","instrument_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section" ADD CONSTRAINT "section_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section" ADD CONSTRAINT "section_instrument_fk" FOREIGN KEY ("instrument_id","engagement_id","org_id") REFERENCES "public"."instrument"("id","engagement_id","org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dimension_org_id_idx" ON "dimension" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "dimension_instrument_id_engagement_id_org_id_idx" ON "dimension" USING btree ("instrument_id","engagement_id","org_id");--> statement-breakpoint
CREATE INDEX "instrument_org_id_idx" ON "instrument" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "instrument_engagement_id_org_id_idx" ON "instrument" USING btree ("engagement_id","org_id");--> statement-breakpoint
CREATE INDEX "instrument_template_id_idx" ON "instrument" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "instrument_created_by_idx" ON "instrument" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "instrument_template_org_id_idx" ON "instrument_template" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "question_org_id_idx" ON "question" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "question_instrument_id_engagement_id_org_id_idx" ON "question" USING btree ("instrument_id","engagement_id","org_id");--> statement-breakpoint
CREATE INDEX "question_section_id_instrument_id_idx" ON "question" USING btree ("section_id","instrument_id");--> statement-breakpoint
CREATE INDEX "question_dimension_id_instrument_id_idx" ON "question" USING btree ("dimension_id","instrument_id");--> statement-breakpoint
CREATE INDEX "question_option_org_id_idx" ON "question_option" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "question_option_instrument_id_engagement_id_org_id_idx" ON "question_option" USING btree ("instrument_id","engagement_id","org_id");--> statement-breakpoint
CREATE INDEX "question_option_question_id_instrument_id_idx" ON "question_option" USING btree ("question_id","instrument_id");--> statement-breakpoint
CREATE INDEX "section_org_id_idx" ON "section" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "section_instrument_id_engagement_id_org_id_idx" ON "section" USING btree ("instrument_id","engagement_id","org_id");--> statement-breakpoint
ALTER TABLE "record_message" ADD CONSTRAINT "record_message_res_type_check" CHECK ("record_message"."res_type" in ('client', 'engagement', 'instrument'));--> statement-breakpoint
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Hand-written below this line: access helpers, the status guard, chatter for instruments, grants
-- and RLS.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

-- Who may change an engagement's data: the engagement is active, and the user is an admin or a
-- consultant assigned with edit access. Archived engagements are read-only to everyone here.
-- The building block for every engagement-scoped table from now on.
CREATE FUNCTION private.can_edit_engagement(p_engagement_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.engagement e
    WHERE e.id = p_engagement_id
      AND e.status = 'active'
      AND (private.has_org_role(e.org_id, 'admin') OR e.id IN (SELECT private.editable_engagement_ids()))
  )
$$;--> statement-breakpoint

-- An instrument's questions are editable only while it is a draft: once open, responses refer to
-- them, so they freeze.
CREATE FUNCTION private.can_edit_instrument_content(p_instrument_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.instrument i
    WHERE i.id = p_instrument_id AND i.status = 'draft' AND private.can_edit_engagement(i.engagement_id)
  )
$$;--> statement-breakpoint

-- Engagement-scope read predicate as a function, shared by the six tables below.
CREATE FUNCTION private.can_read_engagement(p_org_id uuid, p_engagement_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT private.has_org_role(p_org_id, 'admin')
      OR (p_org_id IN (SELECT private.user_org_ids()) AND p_engagement_id IN (SELECT private.assigned_engagement_ids()))
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION private.can_edit_engagement(uuid), private.can_edit_instrument_content(uuid),
  private.can_read_engagement(uuid, uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION private.can_edit_engagement(uuid), private.can_edit_instrument_content(uuid),
  private.can_read_engagement(uuid, uuid) TO authenticated;--> statement-breakpoint

-- ─── Status guard ─────────────────────────────────────────────────────────────────────────────
-- draft → open needs at least one question; open ↔ closed is allowed; nothing goes back to draft.
-- An instrument never moves to another engagement or org, and its anonymity is fixed once opened.
CREATE FUNCTION private.guard_instrument() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.org_id <> OLD.org_id OR NEW.engagement_id <> OLD.engagement_id THEN
    RAISE EXCEPTION 'an instrument cannot move to another engagement' USING ERRCODE = 'TR400';
  END IF;
  -- Respondents were told whether they are anonymous; that promise cannot change under them.
  IF OLD.status <> 'draft' AND NEW.anonymity <> OLD.anonymity THEN
    RAISE EXCEPTION 'anonymity is fixed once an instrument has opened' USING ERRCODE = 'TR424';
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
CREATE TRIGGER instrument_guard BEFORE UPDATE ON public.instrument
  FOR EACH ROW EXECUTE FUNCTION private.guard_instrument();--> statement-breakpoint

CREATE TRIGGER instrument_template_set_updated_at BEFORE UPDATE ON public.instrument_template
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();--> statement-breakpoint
CREATE TRIGGER instrument_set_updated_at BEFORE UPDATE ON public.instrument
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();--> statement-breakpoint
CREATE TRIGGER dimension_set_updated_at BEFORE UPDATE ON public.dimension
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();--> statement-breakpoint
CREATE TRIGGER section_set_updated_at BEFORE UPDATE ON public.section
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();--> statement-breakpoint
CREATE TRIGGER question_set_updated_at BEFORE UPDATE ON public.question
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();--> statement-breakpoint
CREATE TRIGGER question_option_set_updated_at BEFORE UPDATE ON public.question_option
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();--> statement-breakpoint

-- ─── Chatter on instruments ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.can_write_record_message(
  p_res_type text, p_res_id uuid, p_org_id uuid, p_engagement_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE p_res_type
    WHEN 'client' THEN
      p_engagement_id IS NULL
      AND EXISTS (SELECT 1 FROM public.client c WHERE c.id = p_res_id AND c.org_id = p_org_id)
      AND private.has_org_role(p_org_id, 'admin')
    WHEN 'engagement' THEN
      p_engagement_id = p_res_id
      AND EXISTS (
        SELECT 1 FROM public.engagement e
        WHERE e.id = p_res_id AND e.org_id = p_org_id
          AND (private.has_org_role(e.org_id, 'admin')
               OR (e.status = 'active' AND e.id IN (SELECT private.editable_engagement_ids())))
      )
    WHEN 'instrument' THEN
      EXISTS (
        SELECT 1 FROM public.instrument i
        WHERE i.id = p_res_id AND i.org_id = p_org_id AND i.engagement_id = p_engagement_id
          AND private.can_edit_engagement(i.engagement_id)
      )
    ELSE false
  END
$$;--> statement-breakpoint

DROP POLICY parent_visible_select ON public.record_message;--> statement-breakpoint
CREATE POLICY parent_visible_select ON public.record_message FOR SELECT TO authenticated
  USING (
    org_id IN (SELECT private.user_org_ids())
    AND CASE res_type
      WHEN 'client' THEN EXISTS (SELECT 1 FROM public.client c WHERE c.id = res_id)
      WHEN 'engagement' THEN EXISTS (SELECT 1 FROM public.engagement e WHERE e.id = res_id)
      WHEN 'instrument' THEN EXISTS (SELECT 1 FROM public.instrument i WHERE i.id = res_id)
      ELSE false
    END
  );--> statement-breakpoint

CREATE TRIGGER instrument_delete_record_messages AFTER DELETE ON public.instrument
  FOR EACH ROW EXECUTE FUNCTION private.delete_record_messages('instrument');--> statement-breakpoint

-- ─── Grants ───────────────────────────────────────────────────────────────────────────────────
REVOKE ALL ON public.instrument_template, public.instrument, public.dimension, public.section,
  public.question, public.question_option FROM anon;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instrument_template, public.instrument, public.dimension,
  public.section, public.question, public.question_option TO authenticated;--> statement-breakpoint

-- ─── Row Level Security ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.instrument_template ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.instrument ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.dimension ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.section ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.question ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.question_option ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- Templates: Trestle's own (org_id null) are readable by every signed-in user and writable by
-- nobody through the API; a firm's are readable by its members and managed by its admins.
CREATE POLICY shipped_or_member_select ON public.instrument_template FOR SELECT TO authenticated
  USING (org_id IS NULL OR org_id IN (SELECT private.user_org_ids()));--> statement-breakpoint
CREATE POLICY admin_insert ON public.instrument_template FOR INSERT TO authenticated
  WITH CHECK (org_id IS NOT NULL AND private.has_org_role(org_id, 'admin'));--> statement-breakpoint
CREATE POLICY admin_update ON public.instrument_template FOR UPDATE TO authenticated
  USING (org_id IS NOT NULL AND private.has_org_role(org_id, 'admin'))
  WITH CHECK (org_id IS NOT NULL AND private.has_org_role(org_id, 'admin'));--> statement-breakpoint
CREATE POLICY admin_delete ON public.instrument_template FOR DELETE TO authenticated
  USING (org_id IS NOT NULL AND private.has_org_role(org_id, 'admin'));--> statement-breakpoint

-- Instruments: read with the engagement; created, edited and moved through statuses by whoever may
-- edit the engagement; deleted only while still a draft.
CREATE POLICY scoped_select ON public.instrument FOR SELECT TO authenticated
  USING (private.can_read_engagement(org_id, engagement_id));--> statement-breakpoint
CREATE POLICY editor_insert ON public.instrument FOR INSERT TO authenticated
  WITH CHECK (status = 'draft' AND private.can_edit_engagement(engagement_id));--> statement-breakpoint
CREATE POLICY editor_update ON public.instrument FOR UPDATE TO authenticated
  USING (private.can_edit_engagement(engagement_id))
  WITH CHECK (private.can_edit_engagement(engagement_id));--> statement-breakpoint
CREATE POLICY editor_delete_draft ON public.instrument FOR DELETE TO authenticated
  USING (status = 'draft' AND private.can_edit_engagement(engagement_id));--> statement-breakpoint

-- Dimensions, sections, questions and options: read with the engagement; written only while the
-- instrument is a draft, by whoever may edit the engagement.
CREATE POLICY scoped_select ON public.dimension FOR SELECT TO authenticated
  USING (private.can_read_engagement(org_id, engagement_id));--> statement-breakpoint
CREATE POLICY draft_write ON public.dimension FOR ALL TO authenticated
  USING (private.can_edit_instrument_content(instrument_id))
  WITH CHECK (private.can_edit_instrument_content(instrument_id));--> statement-breakpoint
CREATE POLICY scoped_select ON public.section FOR SELECT TO authenticated
  USING (private.can_read_engagement(org_id, engagement_id));--> statement-breakpoint
CREATE POLICY draft_write ON public.section FOR ALL TO authenticated
  USING (private.can_edit_instrument_content(instrument_id))
  WITH CHECK (private.can_edit_instrument_content(instrument_id));--> statement-breakpoint
CREATE POLICY scoped_select ON public.question FOR SELECT TO authenticated
  USING (private.can_read_engagement(org_id, engagement_id));--> statement-breakpoint
CREATE POLICY draft_write ON public.question FOR ALL TO authenticated
  USING (private.can_edit_instrument_content(instrument_id))
  WITH CHECK (private.can_edit_instrument_content(instrument_id));--> statement-breakpoint
CREATE POLICY scoped_select ON public.question_option FOR SELECT TO authenticated
  USING (private.can_read_engagement(org_id, engagement_id));--> statement-breakpoint
CREATE POLICY draft_write ON public.question_option FOR ALL TO authenticated
  USING (private.can_edit_instrument_content(instrument_id))
  WITH CHECK (private.can_edit_instrument_content(instrument_id));
