alter table public.investment enable row level security;

revoke all on table public.investment from anon, authenticated;

create index if not exists investment_user_instrument_type_idx
  on public.investment (user_id, instrument_code, instrument_type);
