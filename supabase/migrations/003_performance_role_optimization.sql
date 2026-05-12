-- ============================================================
-- Serenagri AI - Performance & Role Optimization Schema
-- Migration 003: Add transactions, matching_analyses,
--   weather_analyses, and rate_limits tables
-- ============================================================

-- 1. Transactions table
-- ============================================================
create table public.transactions (
  id uuid not null default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  farmer_id uuid references public.profiles(id) on delete set null,
  commodity text not null,
  volume numeric not null,
  volume_unit text not null,
  price_per_unit numeric,
  total_value numeric,
  delivery_province text not null,
  delivery_city text,
  start_date date,
  end_date date,
  status text not null default 'draft'
    check (status in ('draft', 'proposed', 'accepted', 'in_progress', 'completed', 'cancelled')),
  terms jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id)
);

-- 2. Matching Analyses table
-- ============================================================
create table public.matching_analyses (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  input jsonb not null,
  result jsonb,
  created_at timestamptz not null default now(),
  primary key (id)
);

-- 3. Weather Analyses table
-- ============================================================
create table public.weather_analyses (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  input jsonb not null,
  result jsonb,
  created_at timestamptz not null default now(),
  primary key (id)
);

-- 4. Rate Limits table
-- ============================================================
create table public.rate_limits (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  request_count integer not null default 0,
  window_start timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (id)
);

-- 5. Indexes
-- ============================================================
create index idx_transactions_buyer on public.transactions(buyer_id, created_at desc);
create index idx_transactions_farmer on public.transactions(farmer_id, created_at desc);
create index idx_matching_analyses_user on public.matching_analyses(user_id, created_at desc);
create index idx_weather_analyses_user on public.weather_analyses(user_id, created_at desc);
create index idx_rate_limits_user_endpoint on public.rate_limits(user_id, endpoint, window_start);

-- 6. Trigger: auto-update updated_at on transactions
-- ============================================================
create trigger transactions_updated_at
  before update on public.transactions
  for each row execute procedure public.update_updated_at();

-- 7. Enable Row Level Security
-- ============================================================
alter table public.transactions enable row level security;
alter table public.matching_analyses enable row level security;
alter table public.weather_analyses enable row level security;
alter table public.rate_limits enable row level security;

-- 8. RLS Policies: transactions
-- ============================================================
create policy "Users can view own transactions"
  on public.transactions for select
  using (auth.uid() = buyer_id or auth.uid() = farmer_id);

create policy "Users can insert transactions as buyer"
  on public.transactions for insert
  with check (auth.uid() = buyer_id);

create policy "Users can update own transactions"
  on public.transactions for update
  using (auth.uid() = buyer_id or auth.uid() = farmer_id);

-- 9. RLS Policies: matching_analyses
-- ============================================================
create policy "Users can view own matching analyses"
  on public.matching_analyses for select
  using (auth.uid() = user_id);

create policy "Users can insert own matching analyses"
  on public.matching_analyses for insert
  with check (auth.uid() = user_id);

-- 10. RLS Policies: weather_analyses
-- ============================================================
create policy "Users can view own weather analyses"
  on public.weather_analyses for select
  using (auth.uid() = user_id);

create policy "Users can insert own weather analyses"
  on public.weather_analyses for insert
  with check (auth.uid() = user_id);

-- 11. RLS Policies: rate_limits (service_role only, no authenticated user access)
-- ============================================================
-- No policies are created for authenticated users.
-- The service_role bypasses RLS entirely, so it can SELECT/INSERT/UPDATE.
-- With RLS enabled and no permissive policies, authenticated users have zero access.
