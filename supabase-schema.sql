-- ===========================================================
-- Jornada Brasil — schema V1 (profiles, orcamentos, registros_meu_lucro)
-- Rode UMA vez no Supabase > SQL Editor.
-- ===========================================================
create extension if not exists pgcrypto;

-- ---------- updated_at helper ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  last_seen timestamptz default now(),
  created_at timestamptz default now()
);

-- ---------- orcamentos (Calcular Preço) ----------
create table if not exists public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null default 'Orçamento',
  valor_hora numeric(12,2),
  custos jsonb default '{}'::jsonb,
  margem numeric(7,2),
  preco_final numeric(12,2),
  params jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists orcamentos_user_idx on public.orcamentos (user_id, created_at desc);

-- ---------- registros_meu_lucro (Meu Lucro) ----------
create table if not exists public.registros_meu_lucro (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text,
  data date not null,
  receita numeric(12,2) default 0,
  combustivel numeric(12,2) default 0,
  manutencao numeric(12,2) default 0,
  despesas numeric(12,2) default 0,
  km numeric(12,2) default 0,
  lucro numeric(12,2) default 0,
  meta numeric(12,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, client_id)
);
create index if not exists registros_user_idx on public.registros_meu_lucro (user_id, data desc);

-- ---------- updated_at triggers ----------
drop trigger if exists trg_orcamentos_updated on public.orcamentos;
create trigger trg_orcamentos_updated before update on public.orcamentos
  for each row execute function public.set_updated_at();
drop trigger if exists trg_registros_updated on public.registros_meu_lucro;
create trigger trg_registros_updated before update on public.registros_meu_lucro
  for each row execute function public.set_updated_at();

-- ---------- auto-create profile on signup ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.orcamentos enable row level security;
alter table public.registros_meu_lucro enable row level security;

-- profiles: cada um vê/edita só o próprio
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert with check (auth.uid() = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- orcamentos
drop policy if exists orcamentos_select_own on public.orcamentos;
create policy orcamentos_select_own on public.orcamentos for select using (auth.uid() = user_id);
drop policy if exists orcamentos_insert_own on public.orcamentos;
create policy orcamentos_insert_own on public.orcamentos for insert with check (auth.uid() = user_id);
drop policy if exists orcamentos_update_own on public.orcamentos;
create policy orcamentos_update_own on public.orcamentos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists orcamentos_delete_own on public.orcamentos;
create policy orcamentos_delete_own on public.orcamentos for delete using (auth.uid() = user_id);

-- registros_meu_lucro
drop policy if exists registros_select_own on public.registros_meu_lucro;
create policy registros_select_own on public.registros_meu_lucro for select using (auth.uid() = user_id);
drop policy if exists registros_insert_own on public.registros_meu_lucro;
create policy registros_insert_own on public.registros_meu_lucro for insert with check (auth.uid() = user_id);
drop policy if exists registros_update_own on public.registros_meu_lucro;
create policy registros_update_own on public.registros_meu_lucro for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists registros_delete_own on public.registros_meu_lucro;
create policy registros_delete_own on public.registros_meu_lucro for delete using (auth.uid() = user_id);
