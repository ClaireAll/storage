create table if not exists public.codex_daily_reports (
  r_id uuid primary key default gen_random_uuid(),
  id uuid not null default auth.uid(),
  date date not null,
  thread_title text,
  user_tasks text,
  assistant_summa text,
  created_at timestamptz not null default now(),
  category int2 not null default 10000
);

create index if not exists codex_daily_reports_id_date_idx
  on public.codex_daily_reports (id, date desc);

alter table public.codex_daily_reports enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'codex_daily_reports'
      and policyname = 'codex_daily_reports_select_own'
  ) then
    create policy codex_daily_reports_select_own
      on public.codex_daily_reports
      for select
      to authenticated
      using (id = auth.uid());
  end if;
end
$$;
