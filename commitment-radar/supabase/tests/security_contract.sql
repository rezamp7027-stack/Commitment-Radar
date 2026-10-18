-- Catalog contract checks for Commitment Radar backend hardening.
-- Run as a privileged database role in the target Supabase project.
DO $test$
DECLARE
  v_missing text;
  v_index text;
BEGIN
  SELECT string_agg(expected.table_name, ', ' ORDER BY expected.table_name)
    INTO v_missing
  FROM (VALUES
    ('cr_organizations'), ('cr_memberships'), ('cr_projects'), ('cr_commitments'),
    ('cr_evidence'), ('cr_dependencies'), ('cr_reviews'), ('cr_audit_events')
  ) AS expected(table_name)
  WHERE to_regclass('public.' || expected.table_name) IS NULL;

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Missing Commitment Radar tables: %', v_missing;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname LIKE 'cr\_%' ESCAPE '\'
      AND c.relkind = 'r'
      AND NOT c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'RLS is disabled on one or more Commitment Radar tables';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename LIKE 'cr\_%' ESCAPE '\'
      AND (
        coalesce(qual, '') LIKE '%public.cr_is_member%'
        OR coalesce(qual, '') LIKE '%public.cr_can_edit%'
        OR coalesce(qual, '') LIKE '%public.cr_can_manage%'
        OR coalesce(with_check, '') LIKE '%public.cr_is_member%'
        OR coalesce(with_check, '') LIKE '%public.cr_can_edit%'
        OR coalesce(with_check, '') LIKE '%public.cr_can_manage%'
      )
  ) THEN
    RAISE EXCEPTION 'An RLS policy still references a public authorization helper';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('cr_is_member', 'cr_can_edit', 'cr_can_manage')
  ) THEN
    RAISE EXCEPTION 'A private authorization helper remains in the exposed public schema';
  END IF;

  IF has_function_privilege('anon', 'public.cr_create_organization(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous users can execute the organization-creation RPC';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.cr_create_organization(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Authenticated users cannot execute the organization-creation RPC';
  END IF;

  IF (
    SELECT prosecdef FROM pg_proc
    WHERE oid = 'public.cr_create_organization(text)'::regprocedure
  ) THEN
    RAISE EXCEPTION 'Public organization-creation wrapper must be SECURITY INVOKER';
  END IF;

  IF NOT has_schema_privilege('authenticated', 'private', 'USAGE') THEN
    RAISE EXCEPTION 'Authenticated role lacks required private-schema usage for RLS helpers';
  END IF;

  SELECT string_agg(expected.index_name, ', ' ORDER BY expected.index_name)
    INTO v_index
  FROM (VALUES
    ('cr_audit_events_actor_id_idx'),
    ('cr_commitments_created_by_idx'),
    ('cr_commitments_project_org_idx'),
    ('cr_dependencies_commitment_org_idx'),
    ('cr_dependencies_created_by_idx'),
    ('cr_dependencies_parent_org_idx'),
    ('cr_evidence_commitment_org_idx'),
    ('cr_evidence_created_by_idx'),
    ('cr_evidence_organization_id_idx'),
    ('cr_organizations_owner_id_idx'),
    ('cr_projects_created_by_idx'),
    ('cr_reviews_commitment_org_idx'),
    ('cr_reviews_created_by_idx'),
    ('cr_reviews_reviewed_by_idx')
  ) AS expected(index_name)
  WHERE to_regclass('public.' || expected.index_name) IS NULL;

  IF v_index IS NOT NULL THEN
    RAISE EXCEPTION 'Missing foreign-key supporting indexes: %', v_index;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'cr_log_commitment_change'
      AND p.prosecdef
      AND p.proconfig @> ARRAY['search_path=pg_catalog']
  ) THEN
    RAISE EXCEPTION 'Audit trigger must be SECURITY DEFINER with a fixed pg_catalog search_path';
  END IF;

  IF has_function_privilege('anon', 'public.cr_log_commitment_change()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.cr_log_commitment_change()', 'EXECUTE')
     OR EXISTS (
       SELECT 1
       FROM pg_proc p
       CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) AS acl
       WHERE p.oid = 'public.cr_log_commitment_change()'::regprocedure
         AND acl.grantee = 0
         AND acl.privilege_type = 'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'Audit trigger function must not be directly executable by API roles or PUBLIC';
  END IF;

END;
$test$;
