-- Harden the SECURITY DEFINER audit trigger against search_path object shadowing.
-- This migration is additive and does not alter existing application data.
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

-- Trigger functions are invoked by the trigger, not by direct client RPC calls.
REVOKE ALL ON FUNCTION public.cr_log_commitment_change() FROM PUBLIC, anon, authenticated;

COMMIT;
