-- Additional prediction-ledger integrity checks. Safe to re-run.
-- Does not modify or delete existing rows.
do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'crash_predictions_probability_interval_check'
          and conrelid = 'public.crash_predictions'::regclass
    ) then
        alter table public.crash_predictions
            add constraint crash_predictions_probability_interval_check
            check (confidence_low <= estimated_probability and estimated_probability <= confidence_high);
    end if;

    if not exists (
        select 1 from pg_constraint
        where conname = 'crash_predictions_threshold_finite_check'
          and conrelid = 'public.crash_predictions'::regclass
    ) then
        alter table public.crash_predictions
            add constraint crash_predictions_threshold_finite_check
            check (target_threshold >= 1 and target_threshold < 'Infinity'::numeric);
    end if;

    if not exists (
        select 1 from pg_constraint
        where conname = 'crash_predictions_model_version_nonempty_check'
          and conrelid = 'public.crash_predictions'::regclass
    ) then
        alter table public.crash_predictions
            add constraint crash_predictions_model_version_nonempty_check
            check (length(btrim(model_version)) > 0);
    end if;
end
$$;
