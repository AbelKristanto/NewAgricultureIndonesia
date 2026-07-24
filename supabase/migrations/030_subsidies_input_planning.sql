-- Subsidy tracking (Pelacakan Subsidi) and input planning (Rencana Sarana Produksi) for farmers

create table public.farmer_subsidies (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.profiles(id) on delete cascade,
  program_name text not null,
  institution_name text not null,
  subsidy_type text not null default 'cash' check (subsidy_type in ('cash', 'input', 'equipment', 'training', 'other')),
  amount numeric,
  status text not null default 'planned' check (status in ('planned', 'applied', 'approved', 'rejected', 'disbursed')),
  application_date date,
  disbursement_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_farmer_subsidies_farmer on public.farmer_subsidies(farmer_id, created_at desc);

alter table public.farmer_subsidies enable row level security;

create policy "Farmers can view own subsidies"
  on public.farmer_subsidies for select
  using (auth.uid() = farmer_id);

create policy "Farmers can update own subsidies"
  on public.farmer_subsidies for update
  using (auth.uid() = farmer_id);

create trigger farmer_subsidies_updated_at
  before update on public.farmer_subsidies
  for each row execute procedure public.update_updated_at();

create table public.farmer_input_plans (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.profiles(id) on delete cascade,
  land_plot_id uuid references public.land_plots(id) on delete set null,
  commodity text,
  season_label text,
  item_name text not null,
  item_type text not null default 'other' check (item_type in ('seed', 'fertilizer', 'pesticide', 'equipment', 'other')),
  quantity numeric not null,
  unit text not null,
  unit_cost numeric,
  status text not null default 'planned' check (status in ('planned', 'purchased', 'used')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_farmer_input_plans_farmer on public.farmer_input_plans(farmer_id, created_at desc);
create index idx_farmer_input_plans_land_plot on public.farmer_input_plans(land_plot_id);

alter table public.farmer_input_plans enable row level security;

create policy "Farmers can view own input plans"
  on public.farmer_input_plans for select
  using (auth.uid() = farmer_id);

create policy "Farmers can update own input plans"
  on public.farmer_input_plans for update
  using (auth.uid() = farmer_id);

create trigger farmer_input_plans_updated_at
  before update on public.farmer_input_plans
  for each row execute procedure public.update_updated_at();
