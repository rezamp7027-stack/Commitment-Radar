-- Commitment Radar security hardening: immutable tenant and provenance fields.
-- Additive only: no rows are deleted or rewritten. Apply after the audit cascade guard.
BEGIN;

CREATE OR REPLACE FUNCTION private.cr_guard_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'cr_organizations' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Organization identity and ownership fields are immutable'
        USING ERRCODE = '42501';
    END IF;

  ELSIF TG_TABLE_NAME = 'cr_projects' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR (NEW.created_by IS DISTINCT FROM OLD.created_by AND NEW.created_by IS NOT NULL)
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Project identity, tenant, and provenance fields are immutable'
        USING ERRCODE = '42501';
    END IF;

  ELSIF TG_TABLE_NAME = 'cr_commitments' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR (NEW.created_by IS DISTINCT FROM OLD.created_by AND NEW.created_by IS NOT NULL)
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Commitment identity, tenant, and provenance fields are immutable'
        USING ERRCODE = '42501';
    END IF;

  ELSIF TG_TABLE_NAME = 'cr_evidence' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR NEW.commitment_id IS DISTINCT FROM OLD.commitment_id
       OR (NEW.created_by IS DISTINCT FROM OLD.created_by AND NEW.created_by IS NOT NULL)
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Evidence identity, parent, tenant, and provenance fields are immutable'
        USING ERRCODE = '42501';
    END IF;

  ELSIF TG_TABLE_NAME = 'cr_dependencies' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR NEW.commitment_id IS DISTINCT FROM OLD.commitment_id
       OR NEW.depends_on_commitment_id IS DISTINCT FROM OLD.depends_on_commitment_id
       OR (NEW.created_by IS DISTINCT FROM OLD.created_by AND NEW.created_by IS NOT NULL)
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Dependency identity, endpoints, tenant, and provenance fields are immutable'
        USING ERRCODE = '42501';
    END IF;

  ELSIF TG_TABLE_NAME = 'cr_reviews' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR NEW.commitment_id IS DISTINCT FROM OLD.commitment_id
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Review identity, parent, tenant, and provenance fields are immutable'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.cr_guard_immutable_fields() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER cr_guard_immutable_fields
BEFORE UPDATE ON public.cr_organizations
FOR EACH ROW EXECUTE FUNCTION private.cr_guard_immutable_fields();

CREATE TRIGGER cr_guard_immutable_fields
BEFORE UPDATE ON public.cr_projects
FOR EACH ROW EXECUTE FUNCTION private.cr_guard_immutable_fields();

CREATE TRIGGER cr_guard_immutable_fields
BEFORE UPDATE ON public.cr_commitments
FOR EACH ROW EXECUTE FUNCTION private.cr_guard_immutable_fields();

CREATE TRIGGER cr_guard_immutable_fields
BEFORE UPDATE ON public.cr_evidence
FOR EACH ROW EXECUTE FUNCTION private.cr_guard_immutable_fields();

CREATE TRIGGER cr_guard_immutable_fields
BEFORE UPDATE ON public.cr_dependencies
FOR EACH ROW EXECUTE FUNCTION private.cr_guard_immutable_fields();

CREATE TRIGGER cr_guard_immutable_fields
BEFORE UPDATE ON public.cr_reviews
FOR EACH ROW EXECUTE FUNCTION private.cr_guard_immutable_fields();

COMMIT;
