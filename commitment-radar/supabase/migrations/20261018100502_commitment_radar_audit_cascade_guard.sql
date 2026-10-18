-- Do not create audit rows for commitments deleted by an organization cascade.
-- The organization is already gone when its dependent commitment DELETE trigger fires,
-- and audit_events.organization_id references cr_organizations with ON DELETE CASCADE.
BEGIN;

CREATE OR REPLACE FUNCTION public.cr_log_commitment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_org_id uuid;
  v_entity_id uuid;
  v_status text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_org_id := OLD.organization_id;
    v_entity_id := OLD.id;
    v_status := OLD.status;

    IF NOT EXISTS (
      SELECT 1 FROM public.cr_organizations AS o WHERE o.id = v_org_id
    ) THEN
      RETURN OLD;
    END IF;
  ELSE
    v_org_id := NEW.organization_id;
    v_entity_id := NEW.id;
    v_status := NEW.status;
  END IF;

  INSERT INTO public.cr_audit_events
    (organization_id, actor_id, entity_type, entity_id, action, metadata)
  VALUES (
    v_org_id,
    (SELECT auth.uid()),
    'commitment',
    v_entity_id,
    pg_catalog.lower(TG_OP),
    pg_catalog.jsonb_build_object('status', v_status)
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.cr_log_commitment_change() FROM PUBLIC, anon, authenticated;

COMMIT;
