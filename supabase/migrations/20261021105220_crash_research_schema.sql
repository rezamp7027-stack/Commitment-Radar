-- Baseline for the deployed Crash research schema.
-- Version 20261021105220 matches the live project's recorded crash_research_schema migration.
-- This file documents/recreates the final Crash schema; it does not recreate legacy Commitment-Radar history.

create table if not exists public.crash_rounds (
    id bigint generated always as identity primary key,
    source text not null check (length(btrim(source)) > 0),
    round_id text not null check (length(btrim(round_id)) > 0),
    occurred_at timestamptz,
    multiplier numeric(12, 4) not null
        check (multiplier >= 1 and multiplier < 'Infinity'::numeric),
    schema_version text not null default 'unknown',
    verified boolean not null default false,
    verification_status text not null default 'pending_manual_confirmation'
        check (verification_status in (
            'pending_manual_confirmation', 'verified', 'rejected', 'conflict'
        )),
    verification_method text,
    verified_at timestamptz,
    source_event_sha256 text,
    created_at timestamptz not null default now(),
    constraint crash_rounds_check check (
        (verified = false and verification_status <> 'verified')
        or
        (verified = true and verification_status = 'verified'
            and verification_method is not null
            and length(btrim(verification_method)) > 0
            and verified_at is not null)
    ),
    constraint crash_rounds_source_round_id_key unique (source, round_id)
);

create index if not exists crash_rounds_occurred_at_idx
    on public.crash_rounds (occurred_at desc);
create index if not exists crash_rounds_verified_occurred_at_idx
    on public.crash_rounds (verified, occurred_at desc);

create table if not exists public.crash_predictions (
    id bigint generated always as identity primary key,
    created_at timestamptz not null default now(),
    source text not null check (length(btrim(source)) > 0),
    target_threshold numeric(12, 4) not null check (target_threshold >= 1),
    estimated_probability numeric(8, 7) not null
        check (estimated_probability >= 0 and estimated_probability <= 1),
    confidence_low numeric(8, 7) not null
        check (confidence_low >= 0 and confidence_low <= 1),
    confidence_high numeric(8, 7) not null
        check (confidence_high >= 0 and confidence_high <= 1),
    model_version text not null,
    data_count integer not null check (data_count >= 0),
    decision text not null
        check (decision in ('no_signal', 'research_only', 'candidate_signal')),
    feature_summary jsonb not null default '{}'::jsonb,
    evaluated_round_id text,
    evaluated_multiplier numeric(12, 4)
        check (evaluated_multiplier is null or evaluated_multiplier >= 1),
    evaluated_at timestamptz,
    constraint crash_predictions_check check (confidence_low <= confidence_high)
);

create index if not exists crash_predictions_created_at_idx
    on public.crash_predictions (created_at desc);
create index if not exists crash_predictions_model_threshold_idx
    on public.crash_predictions (model_version, target_threshold, created_at desc);

alter table public.crash_rounds enable row level security;
alter table public.crash_predictions enable row level security;
revoke all on table public.crash_rounds from anon, authenticated;
revoke all on table public.crash_predictions from anon, authenticated;

comment on table public.crash_rounds is
    'Normalized round outcomes; unverified until reconciled against trusted visible history.';
comment on table public.crash_predictions is
    'Research estimate ledger; estimates should be recorded before the corresponding outcome arrives.';
