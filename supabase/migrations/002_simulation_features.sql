-- ============================================================
-- Serenagri AI - Simulation Features Migration
-- Tables: matching_analyses, weather_analyses, transactions
-- ============================================================

-- 1. Matching Analyses (mirrors farmer_analyses)
-- ============================================================
create table public.matching_analyses (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  input jsonb not null,
  result jsonb,
  created_at timestamptz not null default now(),
  primary key (id)
);

create index idx_matching_analyses_user on public.matching_analyses(user_id, created_at desc);

alter table public.matching_analyses enable row level security;

create policy "Users can view own matching analyses"
  on public.matching_analyses for select
  using (auth.uid() = user_id);

create policy "Users can insert own matching analyses"
  on public.matching_analyses for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own matching analyses"
  on public.matching_analyses for delete
  using (auth.uid() = user_id);

-- 2. Weather Analyses (mirrors farmer_analyses)
-- ============================================================
create table public.weather_analyses (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  input jsonb not null,
  result jsonb,
  created_at timestamptz not null default now(),
  primary key (id)
);

create index idx_weather_analyses_user on public.weather_analyses(user_id, created_at desc);

alter table public.weather_analyses enable row level security;

create policy "Users can view own weather analyses"
  on public.weather_analyses for select
  using (auth.uid() = user_id);

create policy "Users can insert own weather analyses"
  on public.weather_analyses for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own weather analyses"
  on public.weather_analyses for delete
  using (auth.uid() = user_id);

-- 3. Transactions / Contract Farming
-- ============================================================
create table public.transactions (
  id uuid not null default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  farmer_id uuid references public.profiles(id) on delete set null,
  commodity text not null,
  volume numeric not null,
  volume_unit text not null default 'tons',
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

create trigger transactions_updated_at
  before update on public.transactions
  for each row execute procedure public.update_updated_at();

create index idx_transactions_buyer on public.transactions(buyer_id, created_at desc);
create index idx_transactions_farmer on public.transactions(farmer_id, created_at desc);
create index idx_transactions_status on public.transactions(status);

alter table public.transactions enable row level security;

create policy "Buyers can view own transactions"
  on public.transactions for select
  using (auth.uid() = buyer_id);

create policy "Farmers can view assigned transactions"
  on public.transactions for select
  using (auth.uid() = farmer_id);

create policy "Buyers can create transactions"
  on public.transactions for insert
  with check (auth.uid() = buyer_id);

create policy "Participants can update transactions"
  on public.transactions for update
  using (auth.uid() = buyer_id or auth.uid() = farmer_id);
