revoke all on function public.create_hobby_share(text, jsonb, jsonb, timestamptz, text) from public;
revoke all on function public.create_hobby_share(text, jsonb, jsonb, timestamptz, text) from anon, authenticated;
grant execute on function public.create_hobby_share(text, jsonb, jsonb, timestamptz, text) to service_role;

grant execute on function public.resolve_hobby_share(text, text) to anon, authenticated;
