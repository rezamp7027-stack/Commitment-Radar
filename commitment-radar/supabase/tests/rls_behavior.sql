-- Behavioral multi-tenant/RLS test for the reconstructed baseline + hardening migrations.
-- Run only in a disposable database. All fixture writes are rolled back.
\set ON_ERROR_STOP on
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('10000000-0000-0000-0000-000000000001', 'cr-owner-a@example.test'),
  ('10000000-0000-0000-0000-000000000002', 'cr-owner-b@example.test'),
  ('10000000-0000-0000-0000-000000000003', 'cr-viewer-a@example.test')
ON CONFLICT (id) DO NOTHING;

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
SELECT public.cr_create_organization('Test Org A') AS org_a \gset
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
SELECT public.cr_create_organization('Test Org B') AS org_b \gset

INSERT INTO public.cr_memberships (organization_id, user_id, role)
VALUES (:'org_a'::uuid, '10000000-0000-0000-0000-000000000003', 'viewer');

SELECT set_config('test.cr_org_a', :'org_a', true);
SELECT set_config('test.cr_org_b', :'org_b', true);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

DO $assert_owner_isolation$
BEGIN
  IF (SELECT count(*) FROM public.cr_organizations
      WHERE id = current_setting('test.cr_org_a')::uuid) <> 1 THEN
    RAISE EXCEPTION 'Owner should see their own organization';
  END IF;
  IF (SELECT count(*) FROM public.cr_organizations
      WHERE id = current_setting('test.cr_org_b')::uuid) <> 0 THEN
    RAISE EXCEPTION 'Cross-tenant organization read was not blocked';
  END IF;
END;
$assert_owner_isolation$;

INSERT INTO public.cr_projects (organization_id, name, created_by)
VALUES (current_setting('test.cr_org_a')::uuid, 'Owner-created project', auth.uid())
RETURNING id AS project_a \gset
SELECT set_config('test.cr_project_a', :'project_a', true);

DO $assert_organization_owner_immutable$
BEGIN
  BEGIN
    UPDATE public.cr_organizations
    SET owner_id = '10000000-0000-0000-0000-000000000002'
    WHERE id = current_setting('test.cr_org_a')::uuid;
    RAISE EXCEPTION 'Organization owner_id unexpectedly changed';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END;
$assert_organization_owner_immutable$;

-- Add the same actor to a second tenant so the RLS policy alone would permit
-- a tenant reassignment. The database guard must still reject the mutation.
RESET ROLE;
INSERT INTO public.cr_memberships (organization_id, user_id, role)
VALUES (current_setting('test.cr_org_b')::uuid, '10000000-0000-0000-0000-000000000001', 'editor');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

DO $assert_tenant_id_immutable$
BEGIN
  BEGIN
    UPDATE public.cr_projects
    SET organization_id = current_setting('test.cr_org_b')::uuid
    WHERE id = current_setting('test.cr_project_a')::uuid;
    RAISE EXCEPTION 'Project organization_id unexpectedly changed';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    UPDATE public.cr_projects
    SET created_by = '10000000-0000-0000-0000-000000000002'
    WHERE id = current_setting('test.cr_project_a')::uuid;
    RAISE EXCEPTION 'Project created_by unexpectedly changed';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END;
$assert_tenant_id_immutable$;

UPDATE public.cr_projects
SET name = 'Project title can still be edited'
WHERE id = current_setting('test.cr_project_a')::uuid;

DO $assert_valid_update_still_works$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.cr_projects
    WHERE id = current_setting('test.cr_project_a')::uuid
      AND name = 'Project title can still be edited'
  ) THEN
    RAISE EXCEPTION 'Allowed project content update was blocked';
  END IF;
END;
$assert_valid_update_still_works$;

SELECT public.cr_create_organization('Created through public RPC') AS rpc_org \gset
SELECT set_config('test.cr_rpc_org', :'rpc_org', true);

DO $assert_rpc$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.cr_organizations o
    JOIN public.cr_memberships m ON m.organization_id = o.id
    WHERE o.id = current_setting('test.cr_rpc_org')::uuid
      AND o.owner_id = auth.uid()
      AND m.user_id = auth.uid()
      AND m.role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Organization RPC did not atomically create owner membership';
  END IF;
END;
$assert_rpc$;

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);

DO $assert_viewer_cannot_write$
BEGIN
  BEGIN
    INSERT INTO public.cr_projects (organization_id, name, created_by)
    VALUES (current_setting('test.cr_org_a')::uuid, 'Viewer must not create', auth.uid());
    RAISE EXCEPTION 'Viewer unexpectedly inserted a project';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;
END;
$assert_viewer_cannot_write$;

ROLLBACK;
