alter table public.codex_log
  add column if not exists token_count int4 not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'codex_log_token_count_nonnegative'
      and conrelid = 'public.codex_log'::regclass
  ) then
    alter table public.codex_log
      add constraint codex_log_token_count_nonnegative
      check (token_count >= 0);
  end if;
end
$$;
