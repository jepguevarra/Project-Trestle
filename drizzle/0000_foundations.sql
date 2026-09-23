CREATE TYPE "public"."member_role" AS ENUM('owner', 'admin', 'consultant', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."org_plan" AS ENUM('solo', 'practice', 'firm', 'enterprise');--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "member_role" NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"invited_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "member_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"plan" "org_plan" DEFAULT 'solo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invitation_token_hash_key" ON "invitation" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "invitation_org_id_email_pending_key" ON "invitation" USING btree ("org_id",lower("email")) WHERE "invitation"."accepted_at" is null;--> statement-breakpoint
CREATE INDEX "invitation_org_id_idx" ON "invitation" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "invitation_invited_by_idx" ON "invitation" USING btree ("invited_by");--> statement-breakpoint
CREATE UNIQUE INDEX "membership_org_id_user_id_key" ON "membership" USING btree ("org_id","user_id");--> statement-breakpoint
CREATE INDEX "membership_org_id_idx" ON "membership" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "membership_user_id_idx" ON "membership" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_slug_key" ON "organization" USING btree ("slug");--> statement-breakpoint
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Hand-written below this line: helpers, triggers, grants and RLS. Never a migration without its
-- policies (docs/plan/README.md). Re-running `pnpm db:generate` does not touch this file.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

-- `private` holds helpers used by policies. It is not exposed through the Supabase Data API.
CREATE SCHEMA IF NOT EXISTS private;--> statement-breakpoint
REVOKE ALL ON SCHEMA private FROM PUBLIC;--> statement-breakpoint
GRANT USAGE ON SCHEMA private TO authenticated;--> statement-breakpoint

CREATE FUNCTION private.role_rank(r public.member_role) RETURNS integer
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE r WHEN 'owner' THEN 4 WHEN 'admin' THEN 3 WHEN 'consultant' THEN 2 WHEN 'viewer' THEN 1 END
$$;--> statement-breakpoint

-- The orgs the current user belongs to. SECURITY DEFINER because a policy on `membership` that
-- selects from `membership` directly recurses forever; this reads it once, outside RLS.
CREATE FUNCTION private.user_org_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT m.org_id FROM public.membership m WHERE m.user_id = (SELECT auth.uid())
$$;--> statement-breakpoint

CREATE FUNCTION private.has_org_role(p_org_id uuid, p_min public.member_role) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.membership m
    WHERE m.org_id = p_org_id
      AND m.user_id = (SELECT auth.uid())
      AND private.role_rank(m.role) >= private.role_rank(p_min)
  )
$$;--> statement-breakpoint

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION private.role_rank(public.member_role), private.user_org_ids(),
  private.has_org_role(uuid, public.member_role) TO authenticated;--> statement-breakpoint

-- ─── updated_at ────────────────────────────────────────────────────────────────────────────────
CREATE FUNCTION private.set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER organization_set_updated_at BEFORE UPDATE ON public.organization
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();--> statement-breakpoint
CREATE TRIGGER membership_set_updated_at BEFORE UPDATE ON public.membership
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();--> statement-breakpoint
CREATE TRIGGER invitation_set_updated_at BEFORE UPDATE ON public.invitation
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();--> statement-breakpoint

-- ─── Membership integrity ─────────────────────────────────────────────────────────────────────
-- A membership row never moves between orgs or users; change the role or delete it instead.
-- And an org always keeps at least one owner, except while the org itself is being deleted.
CREATE FUNCTION private.guard_membership() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.org_id <> OLD.org_id OR NEW.user_id <> OLD.user_id) THEN
    RAISE EXCEPTION 'membership org_id and user_id are immutable' USING ERRCODE = 'TR400';
  END IF;

  IF OLD.role = 'owner'
     AND (TG_OP = 'DELETE' OR NEW.role <> 'owner')
     AND EXISTS (SELECT 1 FROM public.organization o WHERE o.id = OLD.org_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.membership m
       WHERE m.org_id = OLD.org_id AND m.role = 'owner' AND m.id <> OLD.id
     ) THEN
    RAISE EXCEPTION 'an organisation must keep at least one owner' USING ERRCODE = 'TR409';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER membership_guard BEFORE UPDATE OR DELETE ON public.membership
  FOR EACH ROW EXECUTE FUNCTION private.guard_membership();--> statement-breakpoint

-- ─── Organisation creation ────────────────────────────────────────────────────────────────────
-- Organisations are never inserted directly (there is no INSERT policy). They are created here,
-- together with the creator's owner membership, in one transaction.
CREATE FUNCTION private.slugify(p_name text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT coalesce(
    nullif(left(trim(BOTH '-' FROM regexp_replace(lower(p_name), '[^a-z0-9]+', '-', 'g')), 48), ''),
    'org'
  )
$$;--> statement-breakpoint

CREATE FUNCTION private.create_org_with_owner(p_user_id uuid, p_name text) RETURNS public.organization
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_base text := private.slugify(p_name);
  v_slug text := v_base;
  v_org public.organization;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = 'TR401';
  END IF;
  IF length(trim(coalesce(p_name, ''))) = 0 THEN
    RAISE EXCEPTION 'organisation name is required' USING ERRCODE = 'TR400';
  END IF;

  -- Top-level app routes shadow /[orgSlug], so an org may never take one of their names.
  WHILE v_slug = ANY (ARRAY['api', 'auth', 'invite', 'login', 'logout', 'signup', 'welcome',
                            'reset-password', 'update-password', 'settings', 'admin', 'app', 'new'])
        OR EXISTS (SELECT 1 FROM public.organization o WHERE o.slug = v_slug) LOOP
    v_slug := v_base || '-' || substr(md5(random()::text), 1, 6);
  END LOOP;

  INSERT INTO public.organization (name, slug) VALUES (trim(p_name), v_slug) RETURNING * INTO v_org;
  INSERT INTO public.membership (org_id, user_id, role) VALUES (v_org.id, p_user_id, 'owner');
  RETURN v_org;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION private.create_org_with_owner(uuid, text) FROM PUBLIC;--> statement-breakpoint

-- Sign-up: when Supabase Auth inserts the user, create their organisation and owner membership in
-- the same transaction. Users who sign up to accept an invitation pass no org_name and get no org.
CREATE FUNCTION private.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_name text := nullif(trim(NEW.raw_user_meta_data ->> 'org_name'), '');
BEGIN
  IF v_name IS NOT NULL THEN
    PERFORM private.create_org_with_owner(NEW.id, v_name);
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();--> statement-breakpoint

-- A signed-in user creating an additional organisation.
CREATE FUNCTION public.create_organization(p_name text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RETURN (private.create_org_with_owner((SELECT auth.uid()), p_name)).slug;
END
$$;--> statement-breakpoint

-- ─── Invitations ──────────────────────────────────────────────────────────────────────────────
-- The invitee is not a member yet, so RLS hides the invitation from them. Acceptance runs here:
-- the token must match, be unexpired and unused, and have been sent to the caller's own address.
CREATE FUNCTION public.accept_invitation(p_token text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_inv public.invitation;
  v_email text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = 'TR401';
  END IF;

  SELECT * INTO v_inv FROM public.invitation i
  WHERE i.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
  FOR UPDATE;

  IF NOT FOUND OR v_inv.accepted_at IS NOT NULL OR v_inv.expires_at <= now() THEN
    RAISE EXCEPTION 'this invitation is invalid, already used, or expired' USING ERRCODE = 'TR404';
  END IF;

  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = v_uid;
  IF v_email IS NULL OR lower(v_email) <> lower(v_inv.email) THEN
    RAISE EXCEPTION 'this invitation was sent to a different email address' USING ERRCODE = 'TR403';
  END IF;

  -- Already a member: keep the existing role rather than silently changing it.
  INSERT INTO public.membership (org_id, user_id, role)
  VALUES (v_inv.org_id, v_uid, v_inv.role)
  ON CONFLICT (org_id, user_id) DO NOTHING;

  UPDATE public.invitation SET accepted_at = now() WHERE id = v_inv.id;

  RETURN (SELECT o.slug FROM public.organization o WHERE o.id = v_inv.org_id);
END
$$;--> statement-breakpoint

-- Members of an org, with their email. auth.users is not readable by `authenticated`, so the
-- members page reads it through here; the caller must belong to the org.
CREATE FUNCTION public.org_members(p_org_id uuid)
RETURNS TABLE (membership_id uuid, user_id uuid, email text, role public.member_role, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT m.id, m.user_id, u.email::text, m.role, m.created_at
  FROM public.membership m
  JOIN auth.users u ON u.id = m.user_id
  WHERE m.org_id = p_org_id
    AND p_org_id IN (SELECT private.user_org_ids())
  ORDER BY private.role_rank(m.role) DESC, u.email
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION public.create_organization(text), public.accept_invitation(text),
  public.org_members(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.create_organization(text), public.accept_invitation(text),
  public.org_members(uuid) TO authenticated;--> statement-breakpoint

-- ─── Grants ───────────────────────────────────────────────────────────────────────────────────
-- Nothing tenant-scoped is reachable by `anon`. The anonymous respondent path (phase 04) goes
-- through a route handler, never the Data API.
REVOKE ALL ON public.organization, public.membership, public.invitation FROM anon;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization, public.membership, public.invitation
  TO authenticated;--> statement-breakpoint

-- ─── Row Level Security ───────────────────────────────────────────────────────────────────────
-- The canonical tenant predicate (ARCHITECTURE.md) is membership in the row's org. For these three
-- tables the write policies also check role, because a Supabase JWT can reach them through the Data
-- API directly: without it a viewer could promote themselves to owner.
ALTER TABLE public.organization ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.membership ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.invitation ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- organization: org_id is the row's own id. No INSERT policy: created by create_org_with_owner.
CREATE POLICY tenant_select ON public.organization FOR SELECT TO authenticated
  USING (id IN (SELECT private.user_org_ids()));--> statement-breakpoint
CREATE POLICY admin_update ON public.organization FOR UPDATE TO authenticated
  USING (private.has_org_role(id, 'admin'))
  WITH CHECK (private.has_org_role(id, 'admin'));--> statement-breakpoint
CREATE POLICY owner_delete ON public.organization FOR DELETE TO authenticated
  USING (private.has_org_role(id, 'owner'));--> statement-breakpoint

-- membership: any member reads the org's roster; admins manage it; only owners touch owners.
CREATE POLICY tenant_select ON public.membership FOR SELECT TO authenticated
  USING (org_id IN (SELECT private.user_org_ids()));--> statement-breakpoint
CREATE POLICY admin_insert ON public.membership FOR INSERT TO authenticated
  WITH CHECK (
    private.has_org_role(org_id, 'admin')
    AND (role <> 'owner' OR private.has_org_role(org_id, 'owner'))
  );--> statement-breakpoint
CREATE POLICY admin_update ON public.membership FOR UPDATE TO authenticated
  USING (
    private.has_org_role(org_id, 'admin')
    AND (role <> 'owner' OR private.has_org_role(org_id, 'owner'))
  )
  WITH CHECK (
    private.has_org_role(org_id, 'admin')
    AND (role <> 'owner' OR private.has_org_role(org_id, 'owner'))
  );--> statement-breakpoint
CREATE POLICY admin_delete ON public.membership FOR DELETE TO authenticated
  USING (
    private.has_org_role(org_id, 'admin')
    AND (role <> 'owner' OR private.has_org_role(org_id, 'owner'))
  );--> statement-breakpoint

-- invitation: admin-only in every direction. Only owners may invite an owner.
CREATE POLICY admin_select ON public.invitation FOR SELECT TO authenticated
  USING (private.has_org_role(org_id, 'admin'));--> statement-breakpoint
CREATE POLICY admin_insert ON public.invitation FOR INSERT TO authenticated
  WITH CHECK (
    private.has_org_role(org_id, 'admin')
    AND (role <> 'owner' OR private.has_org_role(org_id, 'owner'))
  );--> statement-breakpoint
CREATE POLICY admin_update ON public.invitation FOR UPDATE TO authenticated
  USING (private.has_org_role(org_id, 'admin'))
  WITH CHECK (
    private.has_org_role(org_id, 'admin')
    AND (role <> 'owner' OR private.has_org_role(org_id, 'owner'))
  );--> statement-breakpoint
CREATE POLICY admin_delete ON public.invitation FOR DELETE TO authenticated
  USING (private.has_org_role(org_id, 'admin'));
