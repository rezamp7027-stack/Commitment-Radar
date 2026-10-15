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
VALUES (current_setting('test.cr_org_a')::uuid, 'Owner-created project', auth.uid());

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

-- Owners can create normal dependencies, but the database must reject a cycle
-- even if a client bypasses the frontend validation.
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
INSERT INTO public.cr_commitments (organization_id, title, created_by)
VALUES (current_setting('test.cr_org_a')::uuid, 'Dependency cycle node A', auth.uid())
RETURNING id AS dependency_a \gset
INSERT INTO public.cr_commitments (organization_id, title, created_by)
VALUES (current_setting('test.cr_org_a')::uuid, 'Dependency cycle node B', auth.uid())
RETURNING id AS dependency_b \gset
SELECT set_config('test.cr_dependency_a', :'dependency_a', true);
SELECT set_config('test.cr_dependency_b', :'dependency_b', true);

INSERT INTO public.cr_dependencies (organization_id, commitment_id, depends_on_commitment_id, created_by)
VALUES (current_setting('test.cr_org_a')::uuid, :'dependency_a'::uuid, :'dependency_b'::uuid, auth.uid());

DO $assert_dependency_cycle_rejected$
BEGIN
  BEGIN
    INSERT INTO public.cr_dependencies (organization_id, commitment_id, depends_on_commitment_id, created_by)
    VALUES (current_setting('test.cr_org_a')::uuid,
            current_setting('test.cr_dependency_b')::uuid,
            current_setting('test.cr_dependency_a')::uuid, auth.uid());
    RAISE EXCEPTION 'Database did not reject a cyclic dependency chain';
  EXCEPTION
    WHEN check_violation THEN
      NULL;
  END;
END;
$assert_dependency_cycle_rejected$;

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
