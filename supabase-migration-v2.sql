-- ===========================================================
-- Jornada Brasil — schema V2 (produto completo)
-- Adiciona: historico_calculos, favoritos e campos de plano em profiles.
-- Idempotente: pode rodar mais de uma vez sem erro.
-- Rode UMA vez no Supabase > SQL Editor (depois de supabase-schema.sql).
-- ===========================================================
create extension if not exists pgcrypto;

-- ---------- updated_at helper (já existe no V1, recriado por segurança) ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ===========================================================
-- FASE 8 — plano / limites no perfil (tudo desligado por padrão)
-- ===========================================================
alter table public.profiles add column if not exists plano text not null default 'free';
alter table public.profiles add column if not exists plano_status text not null default 'ativo';
alter table public.profiles add column if not exists plano_renova_em timestamptz;
alter table public.profiles add column if not exists limites jsonb not null default '{}'::jsonb;

-- ===========================================================
-- FASE 3 — histórico de cálculos (salário líquido, rescisão, férias, PJxCLT, etc.)
-- ===========================================================
create table if not exists public.historico_calculos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null,                       -- ex.: 'liquido', 'rescisao', 'ferias', 'pj'
  titulo text,                              -- rótulo amigável da calculadora
  url text,                                 -- caminho para reabrir (ex.: /salario-liquido/)
  valor_principal numeric(14,2),            -- valor de destaque do resultado
  valor_label text,                         -- rótulo do valor de destaque
  resumo jsonb not null default '[]'::jsonb,-- principais linhas do resultado
  inputs jsonb not null default '{}'::jsonb,-- estado do formulário para reabrir
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists historico_user_idx on public.historico_calculos (user_id, created_at desc);

drop trigger if exists trg_historico_updated on public.historico_calculos;
create trigger trg_historico_updated before update on public.historico_calculos
  for each row execute function public.set_updated_at();

-- ===========================================================
-- FASE 4 — favoritos (calculadoras e artigos)
-- ===========================================================
create table if not exists public.favoritos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null,                       -- 'calculadora' | 'artigo'
  slug text not null,                       -- identificador estável (ex.: 'salario-liquido')
  titulo text,
  url text,
  created_at timestamptz default now(),
  unique (user_id, tipo, slug)
);
create index if not exists favoritos_user_idx on public.favoritos (user_id, created_at desc);

-- ===========================================================
-- Row Level Security
-- ===========================================================
alter table public.historico_calculos enable row level security;
alter table public.favoritos enable row level security;

-- historico_calculos
drop policy if exists historico_select_own on public.historico_calculos;
create policy historico_select_own on public.historico_calculos for select using (auth.uid() = user_id);
drop policy if exists historico_insert_own on public.historico_calculos;
create policy historico_insert_own on public.historico_calculos for insert with check (auth.uid() = user_id);
drop policy if exists historico_update_own on public.historico_calculos;
create policy historico_update_own on public.historico_calculos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists historico_delete_own on public.historico_calculos;
create policy historico_delete_own on public.historico_calculos for delete using (auth.uid() = user_id);

-- favoritos
drop policy if exists favoritos_select_own on public.favoritos;
create policy favoritos_select_own on public.favoritos for select using (auth.uid() = user_id);
drop policy if exists favoritos_insert_own on public.favoritos;
create policy favoritos_insert_own on public.favoritos for insert with check (auth.uid() = user_id);
drop policy if exists favoritos_delete_own on public.favoritos;
create policy favoritos_delete_own on public.favoritos for delete using (auth.uid() = user_id);
drop policy if exists favoritos_update_own on public.favoritos;
create policy favoritos_update_own on public.favoritos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
