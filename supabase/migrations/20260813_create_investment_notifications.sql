create table if not exists public.investment_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  webhook_url text not null,
  notify_on_recommendation boolean not null default false,
  notify_on_signal boolean not null default false,
  enabled boolean not null default false,
  last_recommendation_key text,
  last_signal_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint investment_notifications_webhook_url_check check (webhook_url ~ '^https://qyapi\.weixin\.qq\.com/cgi-bin/webhook/send\?key=')
);

create unique index if not exists investment_notifications_user_id_idx
  on public.investment_notifications (user_id);

alter table public.investment_notifications enable row level security;

drop policy if exists investment_notifications_manage_own on public.investment_notifications;
create policy investment_notifications_manage_own
  on public.investment_notifications
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
