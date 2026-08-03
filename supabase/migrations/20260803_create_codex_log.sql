create table if not exists public.codex_log (
  r_id uuid primary key default gen_random_uuid(),
  id uuid not null default auth.uid(),
  date date not null,
  thread_title text,
  user_tasks text,
  assistant_summary text,
  created_at timestamptz not null default now(),
  category int2 not null default 10000
);

create index if not exists codex_log_id_date_idx
  on public.codex_log (id, date desc);

alter table public.codex_log enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'codex_log'
      and policyname = 'codex_log_select_own'
  ) then
    create policy codex_log_select_own
      on public.codex_log
      for select
      to authenticated
      using (id = auth.uid());
  end if;
end
$$;
