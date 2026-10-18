# Commitment Radar — KPI and Data-Quality Contract

**Status:** Metric definitions and measurement plan only. No event analytics pipeline or historical KPI baseline is currently verified.

## Product outcomes

Commitment Radar should help users make commitments explicit, keep them moving, and identify obligations that need attention. Measures must be computed from the existing schema without inventing database fields.

## Core KPIs

| KPI | Definition | Source | Important caveat |
|---|---|---|---|
| Open commitment load | Count of commitments whose status is `open`, `in_progress`, or `blocked` | `cr_commitments.status` | Exclude `done` and `cancelled`; segment by organization. |
| Overdue rate | Open commitments with `due_date < current_date` divided by open commitments with a due date | `cr_commitments.due_date,status` | Show numerator and denominator; never count missing due dates as on-time. |
| Completion rate (cohort) | Commitments created in a chosen cohort that are `done` by the measurement date divided by non-cancelled commitments in that cohort | `created_at,status,completed_at` | This is a current-state cohort measure, not a time-series event measure. |
| Review turnaround | Median time from `cr_reviews.created_at` to `reviewed_at` for approved/rejected reviews | `cr_reviews` | Report only when there are completed reviews; do not substitute zero for missing data. |
| Evidence coverage | Commitments with at least one row in `cr_evidence` divided by all commitments in the selected organization | `cr_evidence,cr_commitments` | Coverage does not measure evidence quality or correctness. |
| Project adoption | Active projects with at least one linked commitment divided by all active projects | `cr_projects,cr_commitments` | Exclude archived projects from the denominator. |

## Guardrails

- Every aggregate must be scoped to an authorized organization; RLS remains the access-control boundary.
- Avoid showing a rate when its denominator is zero. Render “No data” instead.
- Keep cancelled commitments separate from successful completions.
- Keep all example data labeled illustrative.
- Do not infer individual productivity, user retention, or causal impact from the current small live dataset.
- Use privacy-preserving aggregates and never expose raw commitment content in analytics exports by default.

## Data quality checks

1. Check that every application table has RLS enabled.
2. Check foreign-key integrity and same-organization constraints.
3. Validate status and priority values against database constraints.
4. Monitor null or blank owner names, missing due dates, and missing source context as completeness signals—not automatic data errors, because those fields are optional.
5. Check duplicate pending review requests and orphaned evidence/dependency records.
6. Check timestamp order for reviews (`reviewed_at >= created_at`) and completion timestamps for completed records.

## Current baseline and limitations

Latest inspected row counts: one organization, one membership, one commitment, and two audit events; projects, evidence, dependencies, and reviews were empty. This sample is too small to set credible performance targets or trend thresholds. The project does not currently have a verified product-event tracking pipeline or historical snapshots, so no retention, funnel, or time-to-completion trend is claimed.

## Suggested SQL diagnostic

Run only as an authorized database operator; keep results aggregated and scoped to an organization.

```sql
select
  organization_id,
  count(*) filter (where status in ('open','in_progress','blocked')) as open_commitments,
  count(*) filter (
    where status in ('open','in_progress','blocked')
      and due_date < current_date
  ) as overdue_commitments,
  count(*) filter (where status = 'done') as completed_commitments,
  count(*) filter (where status = 'cancelled') as cancelled_commitments
from public.cr_commitments
group by organization_id
order by organization_id;
```

Do not expose this aggregate to anonymous users or bypass RLS to power a public dashboard.
