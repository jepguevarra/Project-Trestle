CREATE TYPE "public"."client_size_band" AS ENUM('micro', 'small', 'medium', 'large');--> statement-breakpoint
CREATE TYPE "public"."engagement_access" AS ENUM('edit', 'read');--> statement-breakpoint
CREATE TYPE "public"."engagement_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."engagement_type" AS ENUM('packaged_software', 'custom_build', 'platform_migration', 'automation', 'digitalisation');--> statement-breakpoint
CREATE TABLE "client" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"industry" text,
	"size_band" "client_size_band",
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_id_org_id_key" UNIQUE("id","org_id")
);
--> statement-breakpoint
CREATE TABLE "engagement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "engagement_type" NOT NULL,
	"target_system" text NOT NULL,
	"target_go_live" date,
	"status" "engagement_status" DEFAULT 'active' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "engagement_id_org_id_key" UNIQUE("id","org_id")
);
--> statement-breakpoint
CREATE TABLE "engagement_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"engagement_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"access" "engagement_access" DEFAULT 'read' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client" ADD CONSTRAINT "client_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement" ADD CONSTRAINT "engagement_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement" ADD CONSTRAINT "engagement_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement" ADD CONSTRAINT "engagement_client_fk" FOREIGN KEY ("client_id","org_id") REFERENCES "public"."client"("id","org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_assignment" ADD CONSTRAINT "engagement_assignment_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_assignment" ADD CONSTRAINT "engagement_assignment_engagement_fk" FOREIGN KEY ("engagement_id","org_id") REFERENCES "public"."engagement"("id","org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_assignment" ADD CONSTRAINT "engagement_assignment_membership_fk" FOREIGN KEY ("org_id","user_id") REFERENCES "public"."membership"("org_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_org_id_idx" ON "client" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "engagement_org_id_status_idx" ON "engagement" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "engagement_client_id_org_id_idx" ON "engagement" USING btree ("client_id","org_id");--> statement-breakpoint
CREATE INDEX "engagement_created_by_idx" ON "engagement" USING btree ("created_by");--> statement-breakpoint
CREATE UNIQUE INDEX "engagement_assignment_engagement_id_user_id_key" ON "engagement_assignment" USING btree ("engagement_id","user_id");--> statement-breakpoint
CREATE INDEX "engagement_assignment_org_id_idx" ON "engagement_assignment" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "engagement_assignment_engagement_id_org_id_idx" ON "engagement_assignment" USING btree ("engagement_id","org_id");--> statement-breakpoint
CREATE INDEX "engagement_assignment_org_id_user_id_idx" ON "engagement_assignment" USING btree ("org_id","user_id");--> statement-breakpoint
CREATE INDEX "engagement_assignment_user_id_idx" ON "engagement_assignment" USING btree ("user_id");--> statement-breakpoint
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Hand-written below this line: access helpers, guards, grants and RLS.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

-- ─── Engagement access ────────────────────────────────────────────────────────────────────────
-- Owners and admins reach every engagement in their org. Consultants and viewers reach only the
-- engagements they are assigned to. Edit access needs a consultant assigned with `edit`; a viewer
-- is read-only whatever their assignment says. These helpers are what every engagement-scoped
-- table in later phases builds its policies on.

-- Engagements the current user is assigned to (any access).
CREATE FUNCTION private.assigned_engagement_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT ea.engagement_id FROM public.engagement_assignment ea WHERE ea.user_id = (SELECT auth.uid())
$$;--> statement-breakpoint

-- Engagements the current user may edit through an assignment (consultants with `edit` only).
CREATE FUNCTION private.editable_engagement_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT ea.engagement_id
  FROM public.engagement_assignment ea
  JOIN public.membership m ON m.org_id = ea.org_id AND m.user_id = ea.user_id
  WHERE ea.user_id = (SELECT auth.uid()) AND ea.access = 'edit' AND m.role = 'consultant'
$$;--> statement-breakpoint

-- The current user's effective access to one engagement: 'edit', 'read' or null (no access).
-- Ignores status; callers treat an archived engagement as read-only.
CREATE FUNCTION private.engagement_access(p_engagement_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE
    WHEN private.role_rank(m.role) >= private.role_rank('admin') THEN 'edit'
    WHEN ea.id IS NULL THEN NULL
    WHEN m.role = 'consultant' AND ea.access = 'edit' THEN 'edit'
    ELSE 'read'
  END
  FROM public.engagement e
  JOIN public.membership m ON m.org_id = e.org_id AND m.user_id = (SELECT auth.uid())
  LEFT JOIN public.engagement_assignment ea ON ea.engagement_id = e.id AND ea.user_id = m.user_id
  WHERE e.id = p_engagement_id
$$;--> statement-breakpoint

-- Clients a consultant or viewer can see because they are assigned to one of its engagements.
CREATE FUNCTION private.assigned_client_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT e.client_id
  FROM public.engagement e
  JOIN public.engagement_assignment ea ON ea.engagement_id = e.id
  WHERE ea.user_id = (SELECT auth.uid())
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION private.assigned_engagement_ids(), private.editable_engagement_ids(),
  private.engagement_access(uuid), private.assigned_client_ids() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION private.assigned_engagement_ids(), private.editable_engagement_ids(),
  private.engagement_access(uuid), private.assigned_client_ids() TO authenticated;--> statement-breakpoint

-- ─── Guards ───────────────────────────────────────────────────────────────────────────────────
CREATE TRIGGER client_set_updated_at BEFORE UPDATE ON public.client
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();--> statement-breakpoint
CREATE TRIGGER engagement_set_updated_at BEFORE UPDATE ON public.engagement
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();--> statement-breakpoint
CREATE TRIGGER engagement_assignment_set_updated_at BEFORE UPDATE ON public.engagement_assignment
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();--> statement-breakpoint

-- Rows never move between orgs. On an engagement, a consultant with edit access may change its
-- details (name, target system, go-live) but not its client, type or status: those are admin
-- decisions, and `type` changes which fields are required on everything under it.
CREATE FUNCTION private.guard_engagement() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.org_id <> OLD.org_id THEN
    RAISE EXCEPTION 'org_id is immutable' USING ERRCODE = 'TR400';
  END IF;
  IF (SELECT auth.uid()) IS NOT NULL
     AND NOT private.has_org_role(OLD.org_id, 'admin')
     AND (NEW.client_id <> OLD.client_id OR NEW.type <> OLD.type OR NEW.status <> OLD.status
          OR NEW.created_by IS DISTINCT FROM OLD.created_by) THEN
    RAISE EXCEPTION 'only an admin can change an engagement''s client, type or status' USING ERRCODE = 'TR405';
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER engagement_guard BEFORE UPDATE ON public.engagement
  FOR EACH ROW EXECUTE FUNCTION private.guard_engagement();--> statement-breakpoint

CREATE FUNCTION private.guard_org_id() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.org_id <> OLD.org_id THEN
    RAISE EXCEPTION 'org_id is immutable' USING ERRCODE = 'TR400';
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER client_guard_org_id BEFORE UPDATE ON public.client
  FOR EACH ROW EXECUTE FUNCTION private.guard_org_id();--> statement-breakpoint
CREATE TRIGGER engagement_assignment_guard_org_id BEFORE UPDATE ON public.engagement_assignment
  FOR EACH ROW EXECUTE FUNCTION private.guard_org_id();--> statement-breakpoint

-- ─── Grants ───────────────────────────────────────────────────────────────────────────────────
REVOKE ALL ON public.client, public.engagement, public.engagement_assignment FROM anon;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client, public.engagement, public.engagement_assignment
  TO authenticated;--> statement-breakpoint

-- ─── Row Level Security ───────────────────────────────────────────────────────────────────────
-- One policy per verb, each carrying both the org predicate and the engagement scope. Postgres ORs
-- permissive policies together, so a separate `engagement_scope` policy next to an org-wide one
-- (as DATA-MODEL.md §12 first sketched it) would widen access rather than narrow it.
ALTER TABLE public.client ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.engagement ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.engagement_assignment ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- client: firm staff (consultant and up) see the client list; a viewer, usually the client's own
-- sponsor, sees only clients of engagements they are assigned to. Admins manage clients.
CREATE POLICY scoped_select ON public.client FOR SELECT TO authenticated
  USING (
    private.has_org_role(org_id, 'consultant')
    OR (org_id IN (SELECT private.user_org_ids()) AND id IN (SELECT private.assigned_client_ids()))
  );--> statement-breakpoint
CREATE POLICY admin_insert ON public.client FOR INSERT TO authenticated
  WITH CHECK (private.has_org_role(org_id, 'admin'));--> statement-breakpoint
CREATE POLICY admin_update ON public.client FOR UPDATE TO authenticated
  USING (private.has_org_role(org_id, 'admin'))
  WITH CHECK (private.has_org_role(org_id, 'admin'));--> statement-breakpoint
CREATE POLICY admin_delete ON public.client FOR DELETE TO authenticated
  USING (private.has_org_role(org_id, 'admin'));--> statement-breakpoint

-- engagement: admins see all; everyone else sees what they are assigned to. Admins create and
-- archive; a consultant with edit access may update an active engagement's details (the guard
-- trigger limits which columns). No DELETE policy: engagements are archived, never deleted.
CREATE POLICY scoped_select ON public.engagement FOR SELECT TO authenticated
  USING (
    private.has_org_role(org_id, 'admin')
    OR (org_id IN (SELECT private.user_org_ids()) AND id IN (SELECT private.assigned_engagement_ids()))
  );--> statement-breakpoint
CREATE POLICY admin_insert ON public.engagement FOR INSERT TO authenticated
  WITH CHECK (private.has_org_role(org_id, 'admin'));--> statement-breakpoint
CREATE POLICY scoped_update ON public.engagement FOR UPDATE TO authenticated
  USING (
    private.has_org_role(org_id, 'admin')
    OR (status = 'active' AND org_id IN (SELECT private.user_org_ids())
        AND id IN (SELECT private.editable_engagement_ids()))
  )
  WITH CHECK (
    private.has_org_role(org_id, 'admin')
    OR (status = 'active' AND org_id IN (SELECT private.user_org_ids())
        AND id IN (SELECT private.editable_engagement_ids()))
  );--> statement-breakpoint

-- engagement_assignment: an engagement's team is visible to admins and to the people on it;
-- only admins change it.
CREATE POLICY scoped_select ON public.engagement_assignment FOR SELECT TO authenticated
  USING (
    private.has_org_role(org_id, 'admin')
    OR (org_id IN (SELECT private.user_org_ids()) AND engagement_id IN (SELECT private.assigned_engagement_ids()))
  );--> statement-breakpoint
CREATE POLICY admin_insert ON public.engagement_assignment FOR INSERT TO authenticated
  WITH CHECK (private.has_org_role(org_id, 'admin'));--> statement-breakpoint
CREATE POLICY admin_update ON public.engagement_assignment FOR UPDATE TO authenticated
  USING (private.has_org_role(org_id, 'admin'))
  WITH CHECK (private.has_org_role(org_id, 'admin'));--> statement-breakpoint
CREATE POLICY admin_delete ON public.engagement_assignment FOR DELETE TO authenticated
  USING (private.has_org_role(org_id, 'admin'));
