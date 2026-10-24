-- Nivaran schema. Run in the Supabase SQL editor (project: nivaran, region ap-south-1).
create extension if not exists pgcrypto;

create table if not exists sessions (
  id uuid primary key,
  created_at timestamptz not null default now(),
  clock_offset_days int not null default 0
);

create table if not exists clusters (
  id uuid primary key default gen_random_uuid(),
  pack text not null,
  category text not null,
  geohash6 text not null,
  locality text,
  status text not null default 'watching' check (status in ('watching','systemic')),
  case_count int not null default 0,
  overdue_count int not null default 0,
  first_seen date,
  last_seen date,
  brief jsonb,
  brief_case_count int,
  brief_updated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (pack, category, geohash6)
);

create table if not exists cases (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'intake',
  pack text not null default 'in-dl',
  citizen_text text not null,
  language text not null default 'en',
  location_text text,
  lat double precision, lng double precision, geohash6 text,
  category text,
  facts jsonb, evidence_findings jsonb, triage jsonb, jurisdiction jsonb, research jsonb, bench jsonb,
  followup_questions jsonb, followup_answers jsonb,
  portal_ref text, filed_at date,
  rti_filed_at date, appeal_filed_at date, second_appeal_filed_at date,
  life_or_liberty boolean not null default false,
  is_demo_seed boolean not null default false,
  cluster_id uuid references clusters(id) on delete set null
);
create index if not exists cases_session_idx on cases(session_id);
create index if not exists cases_status_idx on cases(status);
create index if not exists cases_cluster_idx on cases(cluster_id);

create table if not exists evidence (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  kind text not null check (kind in ('photo','ack','reply')),
  storage_path text not null,
  sha256 text not null,
  mime text not null,
  bytes int not null,
  findings jsonb,
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references cases(id) on delete cascade,
  cluster_id uuid references clusters(id) on delete cascade,
  kind text not null check (kind in ('grievance','reminder','rti','first_appeal','second_appeal','collective')),
  version int not null default 1,
  title text not null,
  body text not null,
  body_hi text,
  status text not null default 'draft' check (status in ('draft','ready','filed','superseded')),
  bench jsonb,
  created_at timestamptz not null default now()
);

create table if not exists deadlines (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  step text not null,
  label text not null,
  basis text not null,
  source_url text,
  starts_on date not null,
  due_on date not null,
  status text not null default 'pending' check (status in ('pending','met','missed')),
  created_at timestamptz not null default now(),
  unique (case_id, step)
);

create table if not exists case_events (
  id bigserial primary key,
  case_id uuid not null references cases(id) on delete cascade,
  at timestamptz not null default now(),
  type text not null,
  payload jsonb not null default '{}'::jsonb
);
create index if not exists case_events_case_idx on case_events(case_id, id);

create table if not exists llm_calls (
  id bigserial primary key,
  case_id uuid, cluster_id uuid,
  step text not null,
  model_key text not null, model_id text not null,
  prompt_tokens int, completion_tokens int, cached_tokens int,
  latency_ms int, cost_usd numeric(12,6),
  ok boolean not null, error text,
  at timestamptz not null default now()
);
create index if not exists llm_calls_case_idx on llm_calls(case_id);

create table if not exists web_cache (
  key text primary key,
  payload jsonb not null,
  at timestamptz not null default now()
);

-- Server-only access: enable RLS with NO policies. Service role bypasses RLS; anon key reads nothing.
alter table sessions enable row level security;
alter table clusters enable row level security;
alter table cases enable row level security;
alter table evidence enable row level security;
alter table documents enable row level security;
alter table deadlines enable row level security;
alter table case_events enable row level security;
alter table llm_calls enable row level security;
alter table web_cache enable row level security;
