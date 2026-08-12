create table if not exists public.codex_daily_report (
  id uuid not null default auth.uid(),
  date date not null,
  desktop_token_total bigint not null default 0,
  session_count int4 not null default 0,
  summary text,
  growth text,
  shortage text,
  summary_model text,
  summary_generated_at timestamptz,
  token_calculated_at timestamptz,
  primary key (id, date)
);

alter table public.codex_daily_report
  add column if not exists desktop_token_total bigint not null default 0,
  add column if not exists session_count int4 not null default 0,
  add column if not exists summary text,
  add column if not exists growth text,
  add column if not exists shortage text,
  add column if not exists summary_model text,
  add column if not exists summary_generated_at timestamptz,
  add column if not exists token_calculated_at timestamptz;

create index if not exists codex_daily_report_id_date_idx
  on public.codex_daily_report (id, date desc);

alter table public.codex_daily_report enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'codex_daily_report'
      and policyname = 'codex_daily_report_select_own'
  ) then
    create policy codex_daily_report_select_own
      on public.codex_daily_report
      for select
      to authenticated
      using (id = auth.uid());
  end if;
end
$$;
