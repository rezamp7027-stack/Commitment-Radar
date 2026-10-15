-- Commitment Radar backend hardening.
-- Additive only: no table or user data is deleted or rewritten.
-- Target: Supabase project htfrixfcirgrhlmwtkjs, public.cr_* schema.
BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.cr_is_member(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.cr_memberships AS m
    WHERE m.organization_id = p_organization_id
      AND m.user_id = (SELECT auth.uid())
  );
$function$;

CREATE OR REPLACE FUNCTION private.cr_can_edit(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.cr_memberships AS m
    WHERE m.organization_id = p_organization_id
      AND m.user_id = (SELECT auth.uid())
      AND m.role IN ('owner', 'admin', 'editor')
  );
$function$;

CREATE OR REPLACE FUNCTION private.cr_can_manage(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.cr_memberships AS m
    WHERE m.organization_id = p_organization_id
      AND m.user_id = (SELECT auth.uid())
      AND m.role IN ('owner', 'admin')
  );
$function$;

CREATE OR REPLACE FUNCTION private.cr_create_organization(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_organization_id uuid;
  v_name text := pg_catalog.btrim(COALESCE(p_name, ''));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;

  IF pg_catalog.char_length(v_name) < 2 OR pg_catalog.char_length(v_name) > 120 THEN
    RAISE EXCEPTION 'Organization name must be between 2 and 120 characters'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.cr_organizations (name, owner_id)
  VALUES (v_name, v_user_id)
  RETURNING id INTO v_organization_id;

  INSERT INTO public.cr_memberships (organization_id, user_id, role)
  VALUES (v_organization_id, v_user_id, 'owner');

  RETURN v_organization_id;
END;
$function$;

REVOKE ALL ON FUNCTION private.cr_is_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.cr_can_edit(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.cr_can_manage(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.cr_create_organization(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.cr_is_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.cr_can_edit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.cr_can_manage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.cr_create_organization(text) TO authenticated;

-- The public RPC is an invoker wrapper. The privileged implementation lives
-- in the non-API private schema and validates auth.uid() itself.
CREATE OR REPLACE FUNCTION public.cr_create_organization(p_name text)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
  SELECT private.cr_create_organization(p_name);
$function$;
REVOKE ALL ON FUNCTION public.cr_create_organization(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cr_create_organization(text) TO authenticated;

-- Point every RLS policy at the private helpers before removing public helpers.
ALTER POLICY cr_audit_events_select ON public.cr_audit_events
  USING (private.cr_is_member(organization_id));

ALTER POLICY cr_commitments_delete ON public.cr_commitments
  USING (private.cr_can_edit(organization_id));
ALTER POLICY cr_commitments_insert ON public.cr_commitments
  WITH CHECK (private.cr_can_edit(organization_id) AND created_by = (SELECT auth.uid()));
ALTER POLICY cr_commitments_select ON public.cr_commitments
  USING (private.cr_is_member(organization_id));
ALTER POLICY cr_commitments_update ON public.cr_commitments
  USING (private.cr_can_edit(organization_id))
  WITH CHECK (private.cr_can_edit(organization_id));

ALTER POLICY cr_dependencies_delete ON public.cr_dependencies
  USING (private.cr_can_edit(organization_id));
ALTER POLICY cr_dependencies_insert ON public.cr_dependencies
  WITH CHECK (private.cr_can_edit(organization_id) AND created_by = (SELECT auth.uid()));
ALTER POLICY cr_dependencies_select ON public.cr_dependencies
  USING (private.cr_is_member(organization_id));

ALTER POLICY cr_evidence_delete ON public.cr_evidence
  USING (private.cr_can_edit(organization_id));
ALTER POLICY cr_evidence_insert ON public.cr_evidence
  WITH CHECK (private.cr_can_edit(organization_id) AND created_by = (SELECT auth.uid()));
ALTER POLICY cr_evidence_select ON public.cr_evidence
  USING (private.cr_is_member(organization_id));
ALTER POLICY cr_evidence_update ON public.cr_evidence
  USING (private.cr_can_edit(organization_id))
  WITH CHECK (private.cr_can_edit(organization_id));

ALTER POLICY cr_memberships_select ON public.cr_memberships
  USING (private.cr_is_member(organization_id));

ALTER POLICY cr_organizations_select ON public.cr_organizations
  USING (private.cr_is_member(id));
ALTER POLICY cr_organizations_update ON public.cr_organizations
  USING (private.cr_can_manage(id))
  WITH CHECK (private.cr_can_manage(id));

ALTER POLICY cr_projects_delete ON public.cr_projects
  USING (private.cr_can_edit(organization_id));
ALTER POLICY cr_projects_insert ON public.cr_projects
  WITH CHECK (private.cr_can_edit(organization_id) AND created_by = (SELECT auth.uid()));
ALTER POLICY cr_projects_select ON public.cr_projects
  USING (private.cr_is_member(organization_id));
ALTER POLICY cr_projects_update ON public.cr_projects
  USING (private.cr_can_edit(organization_id))
  WITH CHECK (private.cr_can_edit(organization_id));

ALTER POLICY cr_reviews_insert ON public.cr_reviews
  WITH CHECK (
    private.cr_can_edit(organization_id)
    AND created_by = (SELECT auth.uid())
    AND status = 'pending'
  );
ALTER POLICY cr_reviews_select ON public.cr_reviews
  USING (private.cr_is_member(organization_id));
ALTER POLICY cr_reviews_update ON public.cr_reviews
  USING (
    private.cr_can_edit(organization_id)
    AND created_by <> (SELECT auth.uid())
    AND status = 'pending'
  )
  WITH CHECK (
    private.cr_can_edit(organization_id)
    AND created_by <> (SELECT auth.uid())
    AND reviewed_by = (SELECT auth.uid())
    AND status IN ('approved', 'rejected')
  );

REVOKE ALL ON FUNCTION public.cr_is_member(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cr_can_edit(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cr_can_manage(uuid) FROM PUBLIC, anon, authenticated;
DROP FUNCTION public.cr_is_member(uuid);
DROP FUNCTION public.cr_can_edit(uuid);
DROP FUNCTION public.cr_can_manage(uuid);

-- Cover all foreign keys flagged by Supabase's performance advisor.
CREATE INDEX IF NOT EXISTS cr_audit_events_actor_id_idx
  ON public.cr_audit_events (actor_id);
CREATE INDEX IF NOT EXISTS cr_commitments_created_by_idx
  ON public.cr_commitments (created_by);
CREATE INDEX IF NOT EXISTS cr_commitments_project_org_idx
  ON public.cr_commitments (project_id, organization_id);
CREATE INDEX IF NOT EXISTS cr_dependencies_commitment_org_idx
  ON public.cr_dependencies (commitment_id, organization_id);
CREATE INDEX IF NOT EXISTS cr_dependencies_created_by_idx
  ON public.cr_dependencies (created_by);
CREATE INDEX IF NOT EXISTS cr_dependencies_parent_org_idx
  ON public.cr_dependencies (depends_on_commitment_id, organization_id);
CREATE INDEX IF NOT EXISTS cr_evidence_commitment_org_idx
  ON public.cr_evidence (commitment_id, organization_id);
CREATE INDEX IF NOT EXISTS cr_evidence_created_by_idx
  ON public.cr_evidence (created_by);
CREATE INDEX IF NOT EXISTS cr_evidence_organization_id_idx
  ON public.cr_evidence (organization_id);
CREATE INDEX IF NOT EXISTS cr_organizations_owner_id_idx
  ON public.cr_organizations (owner_id);
CREATE INDEX IF NOT EXISTS cr_projects_created_by_idx
  ON public.cr_projects (created_by);
CREATE INDEX IF NOT EXISTS cr_reviews_commitment_org_idx
  ON public.cr_reviews (commitment_id, organization_id);
CREATE INDEX IF NOT EXISTS cr_reviews_created_by_idx
  ON public.cr_reviews (created_by);
CREATE INDEX IF NOT EXISTS cr_reviews_reviewed_by_idx
  ON public.cr_reviews (reviewed_by);

COMMIT;
