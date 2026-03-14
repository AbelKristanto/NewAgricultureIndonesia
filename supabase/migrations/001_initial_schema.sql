-- ============================================================
-- Serenagri AI - Initial Database Schema
-- ============================================================

-- 1. Profiles table (extends auth.users)
-- ============================================================
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  username text not null,
  role text not null default 'farmer'
    check (role in ('farmer', 'buyer', 'supplier', 'logistics', 'finance', 'government')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id)
);

-- 2. Trigger: auto-create profile on user signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'farmer')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Trigger: auto-update updated_at
-- ============================================================
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();

-- 4. Farmer Analyses
-- ============================================================
create table public.farmer_analyses (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  input jsonb not null,
  result jsonb,
  created_at timestamptz not null default now(),
  primary key (id)
);

-- 5. Buyer Analyses
-- ============================================================
create table public.buyer_analyses (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  input jsonb not null,
  result jsonb,
  created_at timestamptz not null default now(),
  primary key (id)
);

-- 6. Policy Analyses
-- ============================================================
create table public.policy_analyses (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  input jsonb not null,
  result jsonb,
  created_at timestamptz not null default now(),
  primary key (id)
);

-- 7. Chat Conversations
-- ============================================================
create table public.chat_conversations (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id)
);

create trigger chat_conversations_updated_at
  before update on public.chat_conversations
  for each row execute procedure public.update_updated_at();

-- 8. Chat Messages
-- ============================================================
create table public.chat_messages (
  id uuid not null default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now(),
  primary key (id)
);

-- 9. Indexes
-- ============================================================
create index idx_farmer_analyses_user on public.farmer_analyses(user_id, created_at desc);
create index idx_buyer_analyses_user on public.buyer_analyses(user_id, created_at desc);
create index idx_policy_analyses_user on public.policy_analyses(user_id, created_at desc);
create index idx_chat_conversations_user on public.chat_conversations(user_id, updated_at desc);
create index idx_chat_messages_conversation on public.chat_messages(conversation_id, created_at asc);
create index idx_chat_messages_user on public.chat_messages(user_id);

-- 10. Enable Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.farmer_analyses enable row level security;
alter table public.buyer_analyses enable row level security;
alter table public.policy_analyses enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

-- 11. RLS Policies: profiles
-- ============================================================
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 12. RLS Policies: farmer_analyses
-- ============================================================
create policy "Users can view own farmer analyses"
  on public.farmer_analyses for select
  using (auth.uid() = user_id);

create policy "Users can insert own farmer analyses"
  on public.farmer_analyses for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own farmer analyses"
  on public.farmer_analyses for delete
  using (auth.uid() = user_id);

-- 13. RLS Policies: buyer_analyses
-- ============================================================
create policy "Users can view own buyer analyses"
  on public.buyer_analyses for select
  using (auth.uid() = user_id);

create policy "Users can insert own buyer analyses"
  on public.buyer_analyses for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own buyer analyses"
  on public.buyer_analyses for delete
  using (auth.uid() = user_id);

-- 14. RLS Policies: policy_analyses
-- ============================================================
create policy "Users can view own policy analyses"
  on public.policy_analyses for select
  using (auth.uid() = user_id);

create policy "Users can insert own policy analyses"
  on public.policy_analyses for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own policy analyses"
  on public.policy_analyses for delete
  using (auth.uid() = user_id);

-- 15. RLS Policies: chat_conversations
-- ============================================================
create policy "Users can view own conversations"
  on public.chat_conversations for select
  using (auth.uid() = user_id);

create policy "Users can insert own conversations"
  on public.chat_conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own conversations"
  on public.chat_conversations for update
  using (auth.uid() = user_id);

create policy "Users can delete own conversations"
  on public.chat_conversations for delete
  using (auth.uid() = user_id);

-- 16. RLS Policies: chat_messages
-- ============================================================
create policy "Users can view own messages"
  on public.chat_messages for select
  using (auth.uid() = user_id);

create policy "Users can insert own messages"
  on public.chat_messages for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own messages"
  on public.chat_messages for delete
  using (auth.uid() = user_id);
