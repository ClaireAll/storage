import assert from "node:assert/strict";
import test from "node:test";
import { planCreatedAtBackfill } from "../scripts/backfill-codex-log-created-at.mjs";

test("plans only unique fingerprint matches", () => {
  const result = planCreatedAtBackfill(
    [
      {
        assistant_summary: "完成",
        created_at: "2026-08-10T02:03:04.000Z",
        thread_title: "任务",
        user_tasks: "内容",
      },
    ],
    [
      {
        assistant_summary: "完成",
        r_id: "row-1",
        thread_title: "任务",
        user_tasks: "内容",
      },
    ],
  );

  assert.deepEqual(result.updates, [
    { created_at: "2026-08-10T02:03:04.000Z", r_id: "row-1" },
  ]);
});

test("skips ambiguous and unmatched fingerprints", () => {
  const result = planCreatedAtBackfill(
    [
      {
        assistant_summary: "完成",
        created_at: "2026-08-10T02:03:04.000Z",
        date: "2026-08-10",
        thread_title: "重复任务",
        user_tasks: "内容",
      },
      {
        assistant_summary: "完成",
        created_at: "2026-08-10T02:04:04.000Z",
        date: "2026-08-10",
        thread_title: "未入库任务",
        user_tasks: "内容",
      },
    ],
    [
      {
        assistant_summary: "完成",
        date: "2026-08-10",
        r_id: "row-1",
        thread_title: "重复任务",
        user_tasks: "内容",
      },
      {
        assistant_summary: "完成",
        date: "2026-08-10",
        r_id: "row-2",
        thread_title: "重复任务",
        user_tasks: "内容",
      },
    ],
  );

  assert.deepEqual(result.updates, []);
  assert.equal(result.ambiguous, 1);
  assert.equal(result.unmatched, 1);
});

test("skips entries with an invalid session timestamp", () => {
  const result = planCreatedAtBackfill(
    [
      {
        assistant_summary: "完成",
        created_at: "invalid",
        date: "2026-08-10",
        thread_title: "任务",
        user_tasks: "内容",
      },
    ],
    [
      {
        assistant_summary: "完成",
        date: "2026-08-10",
        r_id: "row-1",
        thread_title: "任务",
        user_tasks: "内容",
      },
    ],
  );

  assert.deepEqual(result.updates, []);
  assert.equal(result.invalid, 1);
});
