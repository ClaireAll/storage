import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeCodexDailyReportEntries,
  saveCodexDailyReports,
} from "../scripts/import-codex-daily-reports.mjs";

function createSupabase(existingEntries = []) {
  const inserts = [];
  const updates = [];

  return {
    inserts,
    supabase: {
      from() {
        return {
          insert(rows) {
            inserts.push(rows);
            return Promise.resolve({ error: null });
          },
          select(fields) {
            assert.doesNotMatch(fields, /user_tasks|assistant_summary/);
            return {
              eq() {
                return {
                  eq() {
                    return Promise.resolve({ data: existingEntries, error: null });
                  },
                };
              },
            };
          },
          update(changes) {
            updates.push(changes);
            return {
              eq() {
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      },
    },
    updates,
  };
}

test("preserves a valid session timestamp", () => {
  const [entry] = normalizeCodexDailyReportEntries(
    [
      {
        created_at: "2026-08-10T02:03:04.000Z",
        thread_title: "任务",
        user_tasks: "执行任务",
      },
    ],
    "2026-08-10",
  );

  assert.equal(entry.created_at, "2026-08-10T02:03:04.000Z");
});

test("omits an invalid session timestamp", () => {
  const [entry] = normalizeCodexDailyReportEntries(
    [
      {
        created_at: "invalid",
        thread_title: "任务",
        user_tasks: "执行任务",
      },
    ],
    "2026-08-10",
  );

  assert.equal("created_at" in entry, false);
});

test("inserts a valid session timestamp", async () => {
  const { inserts, supabase } = createSupabase();

  await saveCodexDailyReports({
    date: "2026-08-10",
    entries: [
      {
        assistant_summary: "已完成",
        created_at: "2026-08-10T02:03:04.000Z",
        thread_title: "任务",
        token_count: 12000,
        user_tasks: "执行任务",
      },
    ],
    ownerId: "owner-1",
    supabase,
  });

  assert.equal(inserts[0][0].created_at, "2026-08-10T02:03:04.000Z");
});

test("updates only the changed session timestamp for an existing entry", async () => {
  const existingEntry = {
    codex_thread_id: "thread-1",
    assistant_summary: "已完成",
    created_at: "2026-08-11T00:05:00.000Z",
    r_id: "row-1",
    thread_title: "任务",
    token_count: 12000,
    user_tasks: "执行任务",
  };
  const { supabase, updates } = createSupabase([existingEntry]);

  await saveCodexDailyReports({
    date: "2026-08-10",
    entries: [
      {
        codex_thread_id: "thread-1",
        assistant_summary: "已完成",
        created_at: "2026-08-10T02:03:04.000Z",
        thread_title: "任务",
        token_count: 12000,
        user_tasks: "执行任务",
      },
    ],
    ownerId: "owner-1",
    supabase,
  });

  assert.deepEqual(updates, [{ created_at: "2026-08-10T02:03:04.000Z" }]);
});

test("仅导入会话元数据，旧格式正文不会写入数据库", async () => {
  const [entry] = normalizeCodexDailyReportEntries([{
    codex_thread_id: "thread-1", thread_title: "修复默认字段定位",
    user_tasks: "不应保存的请求正文", assistant_summary: "不应保存的回答正文", token_count: 123,
  }], "2026-09-04");
  assert.equal(entry.codex_thread_id, "thread-1");
  assert.equal("user_tasks" in entry, false);
  assert.equal("assistant_summary" in entry, false);
  const { inserts, supabase } = createSupabase();
  await saveCodexDailyReports({ date: "2026-09-04", ownerId: "owner-1", entries: [entry], supabase });
  assert.equal(inserts[0][0].token_count, 123);
  assert.equal("user_tasks" in inserts[0][0], false);
  assert.equal("assistant_summary" in inserts[0][0], false);
});

test("同名会话分别保存，同一会话分段合并统计", async () => {
  const entries = normalizeCodexDailyReportEntries([
    { codex_thread_id: "a", thread_title: "修复构建", token_count: 10, created_at: "2026-09-04T01:00:00Z" },
    { codex_thread_id: "b", thread_title: "修复构建", token_count: 20, created_at: "2026-09-04T02:00:00Z" },
    { codex_thread_id: "a", thread_title: "提交修复", token_count: 30, created_at: "2026-09-04T03:00:00Z" },
  ], "2026-09-04");
  assert.equal(entries.length, 2);
  assert.equal(entries[0].token_count, 40);
  assert.equal(entries[0].created_at, "2026-09-04T01:00:00.000Z");
  const { inserts, supabase } = createSupabase();
  await saveCodexDailyReports({ date: "2026-09-04", ownerId: "owner-1", entries, supabase });
  assert.equal(inserts[0].length, 2);
});

test("同一会话更新标题不会新增记录", async () => {
  const { inserts, updates, supabase } = createSupabase([{
    r_id: "row-1", codex_thread_id: "a", thread_title: "旧标题", token_count: 100,
  }]);
  await saveCodexDailyReports({ date: "2026-09-04", ownerId: "owner-1", supabase,
    entries: [{ codex_thread_id: "a", thread_title: "明确的新标题", token_count: 100 }],
  });
  assert.equal(inserts.length, 0);
  assert.deepEqual(updates, [{ thread_title: "明确的新标题" }]);
});

test("历史记录只在时间与分类唯一匹配时接续会话 ID", async () => {
  const existing = { r_id: "row-1", thread_title: "人工整理的标题", category: 4, token_count: 100, created_at: "2026-09-04T01:00:00Z" };
  const entry = { codex_thread_id: "a", thread_title: "新标题", category: 4, token_count: 100, created_at: "2026-09-04T01:00:00Z" };
  const { inserts, updates, supabase } = createSupabase([existing]);
  await saveCodexDailyReports({ date: "2026-09-04", ownerId: "owner-1", supabase, entries: [entry] });
  assert.equal(inserts.length, 0);
  assert.deepEqual(updates, [{ thread_title: "新标题", codex_thread_id: "a" }]);
  const ambiguous = createSupabase([existing, { ...existing, r_id: "row-2" }]);
  await assert.rejects(saveCodexDailyReports({ date: "2026-09-04", ownerId: "owner-1", supabase: ambiguous.supabase, entries: [entry] }), /匹配不唯一/);
  assert.equal(ambiguous.inserts.length + ambiguous.updates.length, 0);
});
