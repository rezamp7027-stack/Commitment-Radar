-- Additive integrity checks for the deployed Crash research schema.
-- Safe to re-run; does not change or delete existing round or prediction records.

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'crash_rounds_source_event_sha256_format_check'
          and conrelid = 'public.crash_rounds'::regclass
    ) then
        alter table public.crash_rounds
            add constraint crash_rounds_source_event_sha256_format_check
            check (source_event_sha256 is null or source_event_sha256 ~ '^[0-9a-f]{64}$');
    end if;

    if not exists (
        select 1 from pg_constraint
        where conname = 'crash_predictions_evaluation_fields_check'
          and conrelid = 'public.crash_predictions'::regclass
    ) then
        alter table public.crash_predictions
            add constraint crash_predictions_evaluation_fields_check
            check (
                (evaluated_round_id is null and evaluated_multiplier is null and evaluated_at is null)
                or
                (evaluated_round_id is not null and length(btrim(evaluated_round_id)) > 0
                    and evaluated_multiplier is not null and evaluated_at is not null)
            );
    end if;
end
$$;
