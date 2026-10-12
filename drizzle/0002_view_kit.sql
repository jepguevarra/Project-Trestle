CREATE TYPE "public"."ocm_stage" AS ENUM('assess', 'develop', 'deploy', 'normalize', 'exit');--> statement-breakpoint
CREATE TYPE "public"."message_kind" AS ENUM('note', 'tracking', 'system');--> statement-breakpoint
CREATE TABLE "record_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"engagement_id" uuid,
	"res_type" text NOT NULL,
	"res_id" uuid NOT NULL,
	"kind" "message_kind" NOT NULL,
	"body" text,
	"tracking" jsonb,
	"author_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "record_message_res_type_check" CHECK ("record_message"."res_type" in ('client', 'engagement')),
	CONSTRAINT "record_message_kind_payload_check" CHECK (("record_message"."kind" = 'tracking') = ("record_message"."tracking" is not null) and ("record_message"."kind" = 'tracking' or "record_message"."body" is not null))
);
--> statement-breakpoint
ALTER TABLE "engagement" ADD COLUMN "ocm_stage" "ocm_stage" DEFAULT 'assess' NOT NULL;--> statement-breakpoint
ALTER TABLE "engagement" ADD COLUMN "start_date" date;--> statement-breakpoint
ALTER TABLE "engagement" ADD COLUMN "end_date" date;--> statement-breakpoint
ALTER TABLE "engagement" ADD COLUMN "objectives" text;--> statement-breakpoint
ALTER TABLE "engagement" ADD COLUMN "scope_summary" text;--> statement-breakpoint
ALTER TABLE "engagement" ADD COLUMN "success_criteria" text;--> statement-breakpoint
ALTER TABLE "engagement" ADD COLUMN "transition_owner" text;--> statement-breakpoint
ALTER TABLE "record_message" ADD CONSTRAINT "record_message_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_message" ADD CONSTRAINT "record_message_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_message" ADD CONSTRAINT "record_message_engagement_fk" FOREIGN KEY ("engagement_id","org_id") REFERENCES "public"."engagement"("id","org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "record_message_res_type_res_id_created_at_idx" ON "record_message" USING btree ("res_type","res_id","created_at");--> statement-breakpoint
CREATE INDEX "record_message_org_id_idx" ON "record_message" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "record_message_engagement_id_org_id_idx" ON "record_message" USING btree ("engagement_id","org_id");--> statement-breakpoint
CREATE INDEX "record_message_author_user_id_idx" ON "record_message" USING btree ("author_user_id");--> statement-breakpoint
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Hand-written below this line: chatter access, the orphan trigger, grants and RLS.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

-- Who may write a message on a record: exactly who may edit the record, and the message's org_id
-- and engagement_id must be the record's own. Clients: admins. Engagements: admins, or a consultant
-- with edit access while the engagement is active. Extend the CASE as models gain chatter.
CREATE FUNCTION private.can_write_record_message(
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
    ELSE false
  END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION private.can_write_record_message(text, uuid, uuid, uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION private.can_write_record_message(text, uuid, uuid, uuid) TO authenticated;--> statement-breakpoint

-- Chatter goes with its record. Engagement-scoped messages also cascade through the engagement FK;
-- this trigger covers org-level records (clients) and makes the rule explicit for every model.
CREATE FUNCTION private.delete_record_messages() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  DELETE FROM public.record_message m WHERE m.res_type = TG_ARGV[0] AND m.res_id = OLD.id;
  RETURN OLD;
END
$$;--> statement-breakpoint
CREATE TRIGGER client_delete_record_messages AFTER DELETE ON public.client
  FOR EACH ROW EXECUTE FUNCTION private.delete_record_messages('client');--> statement-breakpoint
CREATE TRIGGER engagement_delete_record_messages AFTER DELETE ON public.engagement
  FOR EACH ROW EXECUTE FUNCTION private.delete_record_messages('engagement');--> statement-breakpoint

-- ─── Grants ───────────────────────────────────────────────────────────────────────────────────
-- Messages are an append-only log: no UPDATE or DELETE for anyone through the API.
REVOKE ALL ON public.record_message FROM anon;--> statement-breakpoint
GRANT SELECT, INSERT ON public.record_message TO authenticated;--> statement-breakpoint

-- ─── Row Level Security ───────────────────────────────────────────────────────────────────────
-- Read: a message is visible exactly when its record is. The EXISTS subqueries run under the
-- parent table's own RLS, so a viewer who cannot see a client cannot see its notes either.
-- (DATA-MODEL.md §16 first said the policy never looks at res_type; that let viewers read notes on
-- every client in the org. See the phase 02b build notes.)
ALTER TABLE public.record_message ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY parent_visible_select ON public.record_message FOR SELECT TO authenticated
  USING (
    org_id IN (SELECT private.user_org_ids())
    AND CASE res_type
      WHEN 'client' THEN EXISTS (SELECT 1 FROM public.client c WHERE c.id = res_id)
      WHEN 'engagement' THEN EXISTS (SELECT 1 FROM public.engagement e WHERE e.id = res_id)
      ELSE false
    END
  );--> statement-breakpoint
CREATE POLICY editor_insert ON public.record_message FOR INSERT TO authenticated
  WITH CHECK (
    author_user_id = (SELECT auth.uid())
    AND kind IN ('note', 'tracking')
    AND private.can_write_record_message(res_type, res_id, org_id, engagement_id)
  );
