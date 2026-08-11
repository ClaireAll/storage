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
          select() {
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
