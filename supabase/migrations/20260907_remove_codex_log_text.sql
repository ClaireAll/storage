begin;

-- 会话 ID 用于稳定去重，避免依赖可修改的标题或已删除的正文。
alter table public.codex_log
  add column if not exists codex_thread_id text;

create unique index if not exists codex_log_owner_date_thread_idx
  on public.codex_log (id, date, codex_thread_id)
  where codex_thread_id is not null;

-- 日报只保存会话元数据，任务与回答正文不再入库。
alter table public.codex_log
  drop column if exists user_tasks,
  drop column if exists assistant_summary;

notify pgrst, 'reload schema';
commit;
