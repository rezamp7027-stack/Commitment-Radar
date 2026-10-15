-- Prevent circular commitment dependencies at the database layer.
-- This complements the UI check; all API callers are subject to this invariant.

CREATE OR REPLACE FUNCTION private.cr_prevent_dependency_cycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  cycle_found boolean;
BEGIN
  IF NEW.commitment_id = NEW.depends_on_commitment_id THEN
    RAISE EXCEPTION 'A commitment cannot depend on itself'
      USING ERRCODE = '23514';
  END IF;

  WITH RECURSIVE reachable(id) AS (
    SELECT NEW.depends_on_commitment_id
    UNION
    SELECT d.depends_on_commitment_id
    FROM public.cr_dependencies AS d
    JOIN reachable AS r ON d.commitment_id = r.id
    WHERE d.organization_id = NEW.organization_id
      AND (TG_OP <> 'UPDATE' OR d.id <> NEW.id)
  )
  SELECT EXISTS (
    SELECT 1
    FROM reachable
    WHERE id = NEW.commitment_id
  )
  INTO cycle_found;

  IF cycle_found THEN
    RAISE EXCEPTION 'Dependency would create a circular chain'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.cr_prevent_dependency_cycle() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS cr_dependencies_prevent_cycle ON public.cr_dependencies;
CREATE TRIGGER cr_dependencies_prevent_cycle
BEFORE INSERT OR UPDATE OF organization_id, commitment_id, depends_on_commitment_id
ON public.cr_dependencies
FOR EACH ROW
EXECUTE FUNCTION private.cr_prevent_dependency_cycle();
