create extension if not exists pgcrypto with schema extensions;

create or replace function public.hobby_share_slides_are_valid(p_slides jsonb)
returns boolean
language plpgsql
immutable
as $$
begin
  if p_slides is null
    or jsonb_typeof(p_slides) <> 'array'
    or jsonb_array_length(p_slides) = 0 then
    return false;
  end if;

  return not exists (
    select 1
    from jsonb_array_elements(p_slides) as slide(value)
    where jsonb_typeof(slide.value) <> 'object'
      or jsonb_typeof(slide.value -> 'hobbyId') is distinct from 'string'
      or btrim(slide.value ->> 'hobbyId') = ''
      or jsonb_typeof(slide.value -> 'name') is distinct from 'string'
      or btrim(slide.value ->> 'name') = ''
      or jsonb_typeof(slide.value -> 'imageUrl') is distinct from 'string'
      or btrim(slide.value ->> 'imageUrl') = ''
  );
end;
$$;

create table if not exists public.hobby_shares (
  token text primary key,
  owner_id text not null,
  slides jsonb not null,
  theme jsonb not null,
  expires_at timestamptz,
  password_hash text,
  created_at timestamptz not null default now(),
  constraint hobby_shares_valid_slides check (public.hobby_share_slides_are_valid(slides))
);

create index if not exists hobby_shares_owner_created_at_idx
  on public.hobby_shares (owner_id, created_at desc);

create index if not exists hobby_shares_expires_at_idx
  on public.hobby_shares (expires_at)
  where expires_at is not null;

alter table public.hobby_shares enable row level security;

revoke all on table public.hobby_shares from anon, authenticated;

create or replace function public.create_hobby_share(
  p_owner_id text,
  p_slides jsonb,
  p_theme jsonb,
  p_expires_at timestamptz,
  p_password text default null
)
returns table(token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
begin
  if p_owner_id is null or btrim(p_owner_id) = '' then
    raise exception 'owner_id is required';
  end if;

  if not public.hobby_share_slides_are_valid(p_slides) then
    raise exception 'invalid hobby share slides';
  end if;

  if p_theme is null or jsonb_typeof(p_theme) <> 'object' then
    raise exception 'invalid hobby share theme';
  end if;

  loop
    v_token := lower(encode(extensions.gen_random_bytes(16), 'hex'));

    begin
      insert into public.hobby_shares (
        token,
        owner_id,
        slides,
        theme,
        expires_at,
        password_hash
      )
      values (
        v_token,
        p_owner_id,
        p_slides,
        p_theme,
        p_expires_at,
        case
          when nullif(btrim(coalesce(p_password, '')), '') is null then null
          else extensions.crypt(p_password, extensions.gen_salt('bf'))
        end
      )
      returning public.hobby_shares.token, public.hobby_shares.expires_at
        into token, expires_at;

      return next;
      return;
    exception
      when unique_violation then
        -- Retry on the extremely unlikely random token collision.
    end;
  end loop;
end;
$$;

create or replace function public.resolve_hobby_share(
  p_token text,
  p_password text default null
)
returns table(status text, slides jsonb, theme jsonb, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_share public.hobby_shares%rowtype;
begin
  select *
    into v_share
    from public.hobby_shares
    where public.hobby_shares.token = btrim(coalesce(p_token, ''));

  if not found then
    return query select 'not_found'::text, null::jsonb, null::jsonb, null::timestamptz;
    return;
  end if;

  if v_share.expires_at is not null and v_share.expires_at <= now() then
    return query select 'expired'::text, null::jsonb, null::jsonb, v_share.expires_at;
    return;
  end if;

  if v_share.password_hash is not null then
    if nullif(btrim(coalesce(p_password, '')), '') is null then
      return query select 'password_required'::text, null::jsonb, null::jsonb, v_share.expires_at;
      return;
    end if;

    if v_share.password_hash <> extensions.crypt(p_password, v_share.password_hash) then
      return query select 'invalid_password'::text, null::jsonb, null::jsonb, v_share.expires_at;
      return;
    end if;
  end if;

  return query select 'ready'::text, v_share.slides, v_share.theme, v_share.expires_at;
end;
$$;

revoke all on function public.create_hobby_share(text, jsonb, jsonb, timestamptz, text) from public;
revoke all on function public.create_hobby_share(text, jsonb, jsonb, timestamptz, text) from anon, authenticated;
grant execute on function public.create_hobby_share(text, jsonb, jsonb, timestamptz, text) to service_role;

grant execute on function public.resolve_hobby_share(text, text) to anon, authenticated;
