-- Reconstructed baseline for Commitment Radar, version 20261015112619.
-- The historical SQL source was not present in the inspected Git branches. This file
-- was reconstructed from the live catalog before backend hardening (tables, constraints,
-- indexes, policies, grants, functions and triggers). It is for clean-room provisioning;
-- do NOT execute it against the already-migrated target project.
BEGIN;

CREATE TABLE public.cr_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cr_organizations_name_check CHECK (char_length(btrim(name)) BETWEEN 2 AND 120)
);

CREATE TABLE public.cr_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.cr_organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'editor',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cr_memberships_role_check CHECK (role = ANY (ARRAY['owner','admin','editor','viewer'])),
  CONSTRAINT cr_memberships_organization_id_user_id_key UNIQUE (organization_id,user_id),
  CONSTRAINT cr_memberships_id_organization_id_key UNIQUE (id,organization_id)
);

CREATE TABLE public.cr_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.cr_organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cr_projects_name_check CHECK (char_length(btrim(name)) BETWEEN 1 AND 140),
  CONSTRAINT cr_projects_description_check CHECK (char_length(description) <= 3000),
  CONSTRAINT cr_projects_status_check CHECK (status = ANY (ARRAY['active','archived'])),
  CONSTRAINT cr_projects_id_organization_id_key UNIQUE (id,organization_id)
);

CREATE TABLE public.cr_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.cr_organizations(id) ON DELETE CASCADE,
  project_id uuid,
  title text NOT NULL,
  details text NOT NULL DEFAULT '',
  counterparty text NOT NULL DEFAULT '',
  owner_name text NOT NULL DEFAULT '',
  due_date date,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  confidence text NOT NULL DEFAULT 'medium',
  source_type text NOT NULL DEFAULT 'manual',
  source_excerpt text NOT NULL DEFAULT '',
  source_url text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT cr_commitments_title_check CHECK (char_length(btrim(title)) BETWEEN 2 AND 240),
  CONSTRAINT cr_commitments_details_check CHECK (char_length(details) <= 10000),
  CONSTRAINT cr_commitments_counterparty_check CHECK (char_length(counterparty) <= 180),
  CONSTRAINT cr_commitments_owner_name_check CHECK (char_length(owner_name) <= 180),
  CONSTRAINT cr_commitments_status_check CHECK (status = ANY (ARRAY['open','in_progress','blocked','done','cancelled'])),
  CONSTRAINT cr_commitments_priority_check CHECK (priority = ANY (ARRAY['low','normal','high','urgent'])),
  CONSTRAINT cr_commitments_confidence_check CHECK (confidence = ANY (ARRAY['low','medium','high'])),
  CONSTRAINT cr_commitments_source_type_check CHECK (source_type = ANY (ARRAY['manual','chat','email','meeting','document','other'])),
  CONSTRAINT cr_commitments_source_excerpt_check CHECK (char_length(source_excerpt) <= 12000),
  CONSTRAINT cr_commitments_source_url_check CHECK (char_length(source_url) <= 2000),
  CONSTRAINT cr_commitments_id_organization_id_key UNIQUE (id,organization_id),
  CONSTRAINT cr_commitments_project_same_org FOREIGN KEY (project_id,organization_id)
    REFERENCES public.cr_projects(id,organization_id) ON DELETE RESTRICT
);

CREATE TABLE public.cr_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.cr_organizations(id) ON DELETE CASCADE,
  commitment_id uuid NOT NULL,
  label text NOT NULL,
  url text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cr_evidence_label_check CHECK (char_length(btrim(label)) BETWEEN 1 AND 180),
  CONSTRAINT cr_evidence_url_check CHECK (char_length(url) <= 2000),
  CONSTRAINT cr_evidence_note_check CHECK (char_length(note) <= 12000),
  CONSTRAINT cr_evidence_commitment_same_org FOREIGN KEY (commitment_id,organization_id)
    REFERENCES public.cr_commitments(id,organization_id) ON DELETE CASCADE
);

CREATE TABLE public.cr_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.cr_organizations(id) ON DELETE CASCADE,
  commitment_id uuid NOT NULL,
  depends_on_commitment_id uuid NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cr_dependencies_not_self CHECK (commitment_id <> depends_on_commitment_id),
  CONSTRAINT cr_dependencies_unique UNIQUE (commitment_id,depends_on_commitment_id),
  CONSTRAINT cr_dependencies_commitment_same_org FOREIGN KEY (commitment_id,organization_id)
    REFERENCES public.cr_commitments(id,organization_id) ON DELETE CASCADE,
  CONSTRAINT cr_dependencies_parent_same_org FOREIGN KEY (depends_on_commitment_id,organization_id)
    REFERENCES public.cr_commitments(id,organization_id) ON DELETE CASCADE
);

CREATE TABLE public.cr_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.cr_organizations(id) ON DELETE CASCADE,
  commitment_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decision_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  CONSTRAINT cr_reviews_status_check CHECK (status = ANY (ARRAY['pending','approved','rejected'])),
  CONSTRAINT cr_reviews_decision_note_check CHECK (char_length(decision_note) <= 3000),
  CONSTRAINT cr_reviews_commitment_same_org FOREIGN KEY (commitment_id,organization_id)
    REFERENCES public.cr_commitments(id,organization_id) ON DELETE CASCADE
);

CREATE TABLE public.cr_audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.cr_organizations(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cr_audit_events_action_check CHECK (action = ANY (ARRAY['insert','update','delete']))
);

CREATE INDEX cr_memberships_user_id_idx ON public.cr_memberships(user_id);
CREATE INDEX cr_projects_org_status_idx ON public.cr_projects(organization_id,status,created_at DESC);
CREATE INDEX cr_commitments_org_due_idx ON public.cr_commitments(organization_id,due_date);
CREATE INDEX cr_commitments_org_status_idx ON public.cr_commitments(organization_id,status,priority);
CREATE INDEX cr_evidence_commitment_idx ON public.cr_evidence(commitment_id,created_at DESC);
CREATE INDEX cr_dependencies_org_idx ON public.cr_dependencies(organization_id,commitment_id);
CREATE INDEX cr_reviews_org_status_idx ON public.cr_reviews(organization_id,status,created_at DESC);
CREATE UNIQUE INDEX cr_reviews_one_pending_per_commitment ON public.cr_reviews(commitment_id) WHERE status = 'pending';
CREATE INDEX cr_audit_events_org_time_idx ON public.cr_audit_events(organization_id,created_at DESC);

CREATE OR REPLACE FUNCTION public.cr_is_member(p_organization_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.cr_memberships m
    WHERE m.organization_id = p_organization_id AND m.user_id = (SELECT auth.uid()));
$function$;

CREATE OR REPLACE FUNCTION public.cr_can_edit(p_organization_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.cr_memberships m
    WHERE m.organization_id = p_organization_id AND m.user_id = (SELECT auth.uid())
      AND m.role IN ('owner','admin','editor'));
$function$;

CREATE OR REPLACE FUNCTION public.cr_can_manage(p_organization_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.cr_memberships m
    WHERE m.organization_id = p_organization_id AND m.user_id = (SELECT auth.uid())
      AND m.role IN ('owner','admin'));
$function$;

CREATE OR REPLACE FUNCTION public.cr_create_organization(p_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_organization_id uuid;
  v_name text := trim(coalesce(p_name, ''));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;
  IF char_length(v_name) < 2 OR char_length(v_name) > 120 THEN
    RAISE EXCEPTION 'Organization name must be between 2 and 120 characters' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.cr_organizations (name,owner_id) VALUES (v_name,v_user_id)
    RETURNING id INTO v_organization_id;
  INSERT INTO public.cr_memberships (organization_id,user_id,role)
    VALUES (v_organization_id,v_user_id,'owner');
  RETURN v_organization_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cr_log_commitment_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE
  v_org_id uuid;
  v_entity_id uuid;
  v_status text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_org_id := OLD.organization_id; v_entity_id := OLD.id; v_status := OLD.status;
  ELSE
    v_org_id := NEW.organization_id; v_entity_id := NEW.id; v_status := NEW.status;
  END IF;
  INSERT INTO public.cr_audit_events (organization_id,actor_id,entity_type,entity_id,action,metadata)
  VALUES (v_org_id,(SELECT auth.uid()),'commitment',v_entity_id,lower(TG_OP),
    jsonb_build_object('status',v_status));
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cr_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER cr_commitments_audit AFTER INSERT OR UPDATE OR DELETE ON public.cr_commitments
  FOR EACH ROW EXECUTE FUNCTION public.cr_log_commitment_change();
CREATE TRIGGER cr_commitments_set_updated_at BEFORE UPDATE ON public.cr_commitments
  FOR EACH ROW EXECUTE FUNCTION public.cr_set_updated_at();
CREATE TRIGGER cr_organizations_set_updated_at BEFORE UPDATE ON public.cr_organizations
  FOR EACH ROW EXECUTE FUNCTION public.cr_set_updated_at();
CREATE TRIGGER cr_projects_set_updated_at BEFORE UPDATE ON public.cr_projects
  FOR EACH ROW EXECUTE FUNCTION public.cr_set_updated_at();

ALTER TABLE public.cr_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cr_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cr_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cr_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cr_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cr_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cr_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cr_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY cr_organizations_select ON public.cr_organizations FOR SELECT TO authenticated USING (public.cr_is_member(id));
CREATE POLICY cr_organizations_update ON public.cr_organizations FOR UPDATE TO authenticated USING (public.cr_can_manage(id)) WITH CHECK (public.cr_can_manage(id));
CREATE POLICY cr_memberships_select ON public.cr_memberships FOR SELECT TO authenticated USING (public.cr_is_member(organization_id));
CREATE POLICY cr_projects_select ON public.cr_projects FOR SELECT TO authenticated USING (public.cr_is_member(organization_id));
CREATE POLICY cr_projects_insert ON public.cr_projects FOR INSERT TO authenticated WITH CHECK (public.cr_can_edit(organization_id) AND created_by = (SELECT auth.uid()));
CREATE POLICY cr_projects_update ON public.cr_projects FOR UPDATE TO authenticated USING (public.cr_can_edit(organization_id)) WITH CHECK (public.cr_can_edit(organization_id));
CREATE POLICY cr_projects_delete ON public.cr_projects FOR DELETE TO authenticated USING (public.cr_can_edit(organization_id));
CREATE POLICY cr_commitments_select ON public.cr_commitments FOR SELECT TO authenticated USING (public.cr_is_member(organization_id));
CREATE POLICY cr_commitments_insert ON public.cr_commitments FOR INSERT TO authenticated WITH CHECK (public.cr_can_edit(organization_id) AND created_by = (SELECT auth.uid()));
CREATE POLICY cr_commitments_update ON public.cr_commitments FOR UPDATE TO authenticated USING (public.cr_can_edit(organization_id)) WITH CHECK (public.cr_can_edit(organization_id));
CREATE POLICY cr_commitments_delete ON public.cr_commitments FOR DELETE TO authenticated USING (public.cr_can_edit(organization_id));
CREATE POLICY cr_evidence_select ON public.cr_evidence FOR SELECT TO authenticated USING (public.cr_is_member(organization_id));
CREATE POLICY cr_evidence_insert ON public.cr_evidence FOR INSERT TO authenticated WITH CHECK (public.cr_can_edit(organization_id) AND created_by = (SELECT auth.uid()));
CREATE POLICY cr_evidence_update ON public.cr_evidence FOR UPDATE TO authenticated USING (public.cr_can_edit(organization_id)) WITH CHECK (public.cr_can_edit(organization_id));
CREATE POLICY cr_evidence_delete ON public.cr_evidence FOR DELETE TO authenticated USING (public.cr_can_edit(organization_id));
CREATE POLICY cr_dependencies_select ON public.cr_dependencies FOR SELECT TO authenticated USING (public.cr_is_member(organization_id));
CREATE POLICY cr_dependencies_insert ON public.cr_dependencies FOR INSERT TO authenticated WITH CHECK (public.cr_can_edit(organization_id) AND created_by = (SELECT auth.uid()));
CREATE POLICY cr_dependencies_delete ON public.cr_dependencies FOR DELETE TO authenticated USING (public.cr_can_edit(organization_id));
CREATE POLICY cr_reviews_select ON public.cr_reviews FOR SELECT TO authenticated USING (public.cr_is_member(organization_id));
CREATE POLICY cr_reviews_insert ON public.cr_reviews FOR INSERT TO authenticated WITH CHECK (public.cr_can_edit(organization_id) AND created_by = (SELECT auth.uid()) AND status = 'pending');
CREATE POLICY cr_reviews_update ON public.cr_reviews FOR UPDATE TO authenticated
  USING (public.cr_can_edit(organization_id) AND created_by <> (SELECT auth.uid()) AND status = 'pending')
  WITH CHECK (public.cr_can_edit(organization_id) AND created_by <> (SELECT auth.uid()) AND reviewed_by = (SELECT auth.uid()) AND status IN ('approved','rejected'));
CREATE POLICY cr_audit_events_select ON public.cr_audit_events FOR SELECT TO authenticated USING (public.cr_is_member(organization_id));

REVOKE ALL ON FUNCTION public.cr_is_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cr_can_edit(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cr_can_manage(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cr_create_organization(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cr_log_commitment_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cr_set_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cr_is_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cr_can_edit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cr_can_manage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cr_create_organization(text) TO authenticated;

GRANT SELECT, UPDATE ON public.cr_organizations TO authenticated;
GRANT SELECT ON public.cr_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cr_projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cr_commitments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cr_evidence TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.cr_dependencies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.cr_reviews TO authenticated;
GRANT SELECT ON public.cr_audit_events TO authenticated;

COMMIT;
