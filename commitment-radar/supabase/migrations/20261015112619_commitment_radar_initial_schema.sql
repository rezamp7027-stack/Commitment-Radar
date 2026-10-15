-- Commitment Radar: isolated, additive schema. No Hashttick tables are modified or deleted.
begin;

create table public.cr_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cr_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.cr_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner','admin','editor','viewer')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id),
  unique (id, organization_id)
);

create table public.cr_projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.cr_organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 140),
  description text not null default '' check (char_length(description) <= 3000),
  status text not null default 'active' check (status in ('active','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create table public.cr_commitments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.cr_organizations(id) on delete cascade,
  project_id uuid,
  title text not null check (char_length(trim(title)) between 2 and 240),
  details text not null default '' check (char_length(details) <= 10000),
  counterparty text not null default '' check (char_length(counterparty) <= 180),
  owner_name text not null default '' check (char_length(owner_name) <= 180),
  due_date date,
  status text not null default 'open' check (status in ('open','in_progress','blocked','done','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  confidence text not null default 'medium' check (confidence in ('low','medium','high')),
  source_type text not null default 'manual' check (source_type in ('manual','chat','email','meeting','document','other')),
  source_excerpt text not null default '' check (char_length(source_excerpt) <= 12000),
  source_url text not null default '' check (char_length(source_url) <= 2000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (id, organization_id),
  constraint cr_commitments_project_same_org
    foreign key (project_id, organization_id)
    references public.cr_projects(id, organization_id) on delete restrict
);

create table public.cr_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.cr_organizations(id) on delete cascade,
  commitment_id uuid not null,
  label text not null check (char_length(trim(label)) between 1 and 180),
  url text not null default '' check (char_length(url) <= 2000),
  note text not null default '' check (char_length(note) <= 12000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint cr_evidence_commitment_same_org
    foreign key (commitment_id, organization_id)
    references public.cr_commitments(id, organization_id) on delete cascade
);

create table public.cr_dependencies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.cr_organizations(id) on delete cascade,
  commitment_id uuid not null,
  depends_on_commitment_id uuid not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint cr_dependencies_not_self check (commitment_id <> depends_on_commitment_id),
  constraint cr_dependencies_unique unique (commitment_id, depends_on_commitment_id),
  constraint cr_dependencies_commitment_same_org
    foreign key (commitment_id, organization_id)
    references public.cr_commitments(id, organization_id) on delete cascade,
  constraint cr_dependencies_parent_same_org
    foreign key (depends_on_commitment_id, organization_id)
    references public.cr_commitments(id, organization_id) on delete cascade
);

create table public.cr_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.cr_organizations(id) on delete cascade,
  commitment_id uuid not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_by uuid not null references auth.users(id) on delete restrict,
  reviewed_by uuid references auth.users(id) on delete set null,
  decision_note text not null default '' check (char_length(decision_note) <= 3000),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint cr_reviews_commitment_same_org
    foreign key (commitment_id, organization_id)
    references public.cr_commitments(id, organization_id) on delete cascade
);

create unique index cr_reviews_one_pending_per_commitment
  on public.cr_reviews (commitment_id) where status = 'pending';
create index cr_memberships_user_id_idx on public.cr_memberships (user_id);
create index cr_projects_org_status_idx on public.cr_projects (organization_id, status, created_at desc);
create index cr_commitments_org_due_idx on public.cr_commitments (organization_id, due_date);
create index cr_commitments_org_status_idx on public.cr_commitments (organization_id, status, priority);
create index cr_evidence_commitment_idx on public.cr_evidence (commitment_id, created_at desc);
create index cr_dependencies_org_idx on public.cr_dependencies (organization_id, commitment_id);
create index cr_reviews_org_status_idx on public.cr_reviews (organization_id, status, created_at desc);

create table public.cr_audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.cr_organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null check (action in ('insert','update','delete')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index cr_audit_events_org_time_idx on public.cr_audit_events (organization_id, created_at desc);

create or replace function public.cr_set_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger cr_organizations_set_updated_at before update on public.cr_organizations
for each row execute function public.cr_set_updated_at();
create trigger cr_projects_set_updated_at before update on public.cr_projects
for each row execute function public.cr_set_updated_at();
create trigger cr_commitments_set_updated_at before update on public.cr_commitments
for each row execute function public.cr_set_updated_at();

create or replace function public.cr_is_member(p_organization_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.cr_memberships m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.cr_can_edit(p_organization_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.cr_memberships m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner','admin','editor')
  );
$$;

create or replace function public.cr_can_manage(p_organization_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.cr_memberships m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner','admin')
  );
$$;

create or replace function public.cr_create_organization(p_name text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_user_id uuid := auth.uid();
  v_organization_id uuid;
  v_name text := trim(coalesce(p_name, ''));
begin
  if v_user_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'Organization name must be between 2 and 120 characters' using errcode = '22023';
  end if;
  insert into public.cr_organizations (name, owner_id) values (v_name, v_user_id)
  returning id into v_organization_id;
  insert into public.cr_memberships (organization_id, user_id, role)
  values (v_organization_id, v_user_id, 'owner');
  return v_organization_id;
end;
$$;

create or replace function public.cr_log_commitment_change()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
  v_entity_id uuid;
  v_status text;
begin
  if tg_op = 'DELETE' then
    v_org_id := old.organization_id;
    v_entity_id := old.id;
    v_status := old.status;
  else
    v_org_id := new.organization_id;
    v_entity_id := new.id;
    v_status := new.status;
  end if;

  insert into public.cr_audit_events
    (organization_id, actor_id, entity_type, entity_id, action, metadata)
  values (
    v_org_id, (select auth.uid()), 'commitment', v_entity_id, lower(tg_op),
    jsonb_build_object('status', v_status)
  );

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

create trigger cr_commitments_audit
after insert or update or delete on public.cr_commitments
for each row execute function public.cr_log_commitment_change();

alter table public.cr_organizations enable row level security;
alter table public.cr_memberships enable row level security;
alter table public.cr_projects enable row level security;
alter table public.cr_commitments enable row level security;
alter table public.cr_evidence enable row level security;
alter table public.cr_dependencies enable row level security;
alter table public.cr_reviews enable row level security;
alter table public.cr_audit_events enable row level security;

-- Organizations: access only through verified membership; only owners/admins can rename.
create policy cr_organizations_select on public.cr_organizations
for select to authenticated using (public.cr_is_member(id));
create policy cr_organizations_update on public.cr_organizations
for update to authenticated using (public.cr_can_manage(id))
with check (public.cr_can_manage(id));

create policy cr_memberships_select on public.cr_memberships
for select to authenticated using (public.cr_is_member(organization_id));

create policy cr_projects_select on public.cr_projects
for select to authenticated using (public.cr_is_member(organization_id));
create policy cr_projects_insert on public.cr_projects
for insert to authenticated with check (public.cr_can_edit(organization_id) and created_by = (select auth.uid()));
create policy cr_projects_update on public.cr_projects
for update to authenticated using (public.cr_can_edit(organization_id))
with check (public.cr_can_edit(organization_id));
create policy cr_projects_delete on public.cr_projects
for delete to authenticated using (public.cr_can_edit(organization_id));

create policy cr_commitments_select on public.cr_commitments
for select to authenticated using (public.cr_is_member(organization_id));
create policy cr_commitments_insert on public.cr_commitments
for insert to authenticated with check (public.cr_can_edit(organization_id) and created_by = (select auth.uid()));
create policy cr_commitments_update on public.cr_commitments
for update to authenticated using (public.cr_can_edit(organization_id))
with check (public.cr_can_edit(organization_id));
create policy cr_commitments_delete on public.cr_commitments
for delete to authenticated using (public.cr_can_edit(organization_id));

create policy cr_evidence_select on public.cr_evidence
for select to authenticated using (public.cr_is_member(organization_id));
create policy cr_evidence_insert on public.cr_evidence
for insert to authenticated with check (public.cr_can_edit(organization_id) and created_by = (select auth.uid()));
create policy cr_evidence_update on public.cr_evidence
for update to authenticated using (public.cr_can_edit(organization_id))
with check (public.cr_can_edit(organization_id));
create policy cr_evidence_delete on public.cr_evidence
for delete to authenticated using (public.cr_can_edit(organization_id));

create policy cr_dependencies_select on public.cr_dependencies
for select to authenticated using (public.cr_is_member(organization_id));
create policy cr_dependencies_insert on public.cr_dependencies
for insert to authenticated with check (public.cr_can_edit(organization_id) and created_by = (select auth.uid()));
create policy cr_dependencies_delete on public.cr_dependencies
for delete to authenticated using (public.cr_can_edit(organization_id));

create policy cr_reviews_select on public.cr_reviews
for select to authenticated using (public.cr_is_member(organization_id));
create policy cr_reviews_insert on public.cr_reviews
for insert to authenticated with check (public.cr_can_edit(organization_id) and created_by = (select auth.uid()) and status = 'pending');
create policy cr_reviews_update on public.cr_reviews
for update to authenticated
using (public.cr_can_edit(organization_id) and created_by <> (select auth.uid()) and status = 'pending')
with check (
  public.cr_can_edit(organization_id)
  and created_by <> (select auth.uid())
  and reviewed_by = (select auth.uid())
  and status in ('approved','rejected')
);

create policy cr_audit_events_select on public.cr_audit_events
for select to authenticated using (public.cr_is_member(organization_id));

-- Data API access is explicit; RLS remains the row-level boundary. No access for anon.
grant usage on schema public to authenticated;
revoke all on public.cr_organizations, public.cr_memberships, public.cr_projects,
  public.cr_commitments, public.cr_evidence, public.cr_dependencies, public.cr_reviews,
  public.cr_audit_events from anon, authenticated;

grant select, update on public.cr_organizations to authenticated;
grant select on public.cr_memberships to authenticated;
grant select, insert, update, delete on public.cr_projects to authenticated;
grant select, insert, update, delete on public.cr_commitments to authenticated;
grant select, insert, update, delete on public.cr_evidence to authenticated;
grant select, insert, delete on public.cr_dependencies to authenticated;
grant select, insert, update on public.cr_reviews to authenticated;
grant select on public.cr_audit_events to authenticated;

revoke all on function public.cr_is_member(uuid) from public, anon;
revoke all on function public.cr_can_edit(uuid) from public, anon;
revoke all on function public.cr_can_manage(uuid) from public, anon;
revoke all on function public.cr_create_organization(text) from public, anon;
revoke all on function public.cr_set_updated_at() from public, anon, authenticated;
revoke all on function public.cr_log_commitment_change() from public, anon, authenticated;
grant execute on function public.cr_is_member(uuid) to authenticated;
grant execute on function public.cr_can_edit(uuid) to authenticated;
grant execute on function public.cr_can_manage(uuid) to authenticated;
grant execute on function public.cr_create_organization(text) to authenticated;

commit;