alter table public.theme
  add column if not exists hidden_category_keys text[] not null default '{}'::text[];
