-- ============================================================
-- Jornada Brasil — Web Push: tabela de inscrições
-- Executar no SQL Editor do Supabase.
-- A chave publicável (anon) pode INSERIR/atualizar/remover a própria
-- inscrição (o endpoint é um token aleatório e não-adivinhável).
-- A Edge Function 'send-push' usa a service_role (ignora RLS) para ler.
-- ============================================================

create table if not exists public.push_subscriptions (
  endpoint    text primary key,
  p256dh      text,
  auth        text,
  user_id     uuid references auth.users(id) on delete set null,
  user_agent  text,
  topics      text[] not null default array['blog','calc','plataforma'],
  created_at  timestamptz not null default now(),
  last_sent_at timestamptz
);

alter table public.push_subscriptions enable row level security;

-- Inscrição anônima (qualquer visitante pode se inscrever)
drop policy if exists push_insert_any on public.push_subscriptions;
create policy push_insert_any on public.push_subscriptions
  for insert with check (true);

-- Upsert (PostgREST faz INSERT ... ON CONFLICT DO UPDATE — exige UPDATE)
drop policy if exists push_update_any on public.push_subscriptions;
create policy push_update_any on public.push_subscriptions
  for update using (true) with check (true);

-- Cancelar a própria inscrição (por endpoint)
drop policy if exists push_delete_any on public.push_subscriptions;
create policy push_delete_any on public.push_subscriptions
  for delete using (true);

-- Sem política de SELECT para anon: ninguém lê a lista de inscritos.
-- (A Edge Function usa service_role, que ignora o RLS.)

create index if not exists push_subscriptions_created_idx
  on public.push_subscriptions (created_at desc);
