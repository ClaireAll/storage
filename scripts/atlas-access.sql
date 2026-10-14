-- 图谱只经 NextAuth 鉴权的服务端访问，不允许公开客户端绕过用户隔离。
alter table public.atlas_graphs enable row level security;
revoke all privileges on table public.atlas_graphs from anon, authenticated;
