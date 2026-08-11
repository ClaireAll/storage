import assert from "node:assert/strict";
import test from "node:test";
import { parseCodexSessionLines } from "../scripts/generate-codex-daily-entries.mjs";

test("uses the first real user event timestamp as created_at", () => {
  const entry = parseCodexSessionLines(
    [
      JSON.stringify({
        type: "session_meta",
        payload: { cwd: "D:\\Claire\\storage", id: "thread-1" },
      }),
      JSON.stringify({
        timestamp: "2026-08-10T02:03:04.000Z",
        type: "event_msg",
        payload: { message: "真实任务", type: "user_message" },
      }),
      JSON.stringify({
        timestamp: "2026-08-10T02:04:04.000Z",
        type: "event_msg",
        payload: { message: "已完成", type: "agent_message" },
      }),
    ],
    "2026-08-10",
  );

  assert.equal(entry.created_at, "2026-08-10T02:03:04.000Z");
});

test("excludes automation sessions", () => {
  const entry = parseCodexSessionLines(
    [
      JSON.stringify({
        timestamp: "2026-08-10T02:03:04.000Z",
        type: "event_msg",
        payload: { message: "Automation: Codex 日报入库", type: "user_message" },
      }),
    ],
    "2026-08-10",
  );

  assert.equal(entry, null);
});

test("ignores events outside the Shanghai target date", () => {
  const entry = parseCodexSessionLines(
    [
      JSON.stringify({
        timestamp: "2026-08-09T15:59:59.000Z",
        type: "event_msg",
        payload: { message: "前一天任务", type: "user_message" },
      }),
    ],
    "2026-08-10",
  );

  assert.equal(entry, null);
});
