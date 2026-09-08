import assert from "node:assert/strict";
import test from "node:test";
import {
  parseCodexSessionLines,
  parseCodexSessionTaskEntries,
} from "../scripts/generate-codex-daily-entries.mjs";

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

test("keeps each accepted user event with its original timestamp", () => {
  const entries = parseCodexSessionTaskEntries(
    [
      JSON.stringify({
        timestamp: "2026-08-10T02:03:04.000Z",
        type: "event_msg",
        payload: { message: "First task", type: "user_message" },
      }),
      JSON.stringify({
        timestamp: "2026-08-10T02:05:06.000Z",
        type: "event_msg",
        payload: { message: "Second task", type: "user_message" },
      }),
    ],
    "2026-08-10",
  );

  assert.deepEqual(entries, [
    {
      created_at: "2026-08-10T02:03:04.000Z",
      date: "2026-08-10",
      user_tasks: "First task",
    },
    {
      created_at: "2026-08-10T02:05:06.000Z",
      date: "2026-08-10",
      user_tasks: "Second task",
    },
  ]);
});

test("extracts the real request from a wrapped response_item user message", () => {
  const entry = parseCodexSessionLines(
    [
      JSON.stringify({
        timestamp: "2026-09-03T10:33:14.600Z",
        type: "response_item",
        payload: {
          role: "user",
          content: [
            { type: "input_text", text: "<recommended_plugins>plugin list</recommended_plugins>" },
            { type: "input_text", text: "# AGENTS.md instructions for D:\\work\\demo\\n<INSTRUCTIONS>rules</INSTRUCTIONS>" },
            { type: "input_text", text: "<environment_context>cwd and runtime</environment_context>" },
          ],
        },
      }),
      JSON.stringify({
        timestamp: "2026-09-03T10:33:14.869Z",
        type: "response_item",
        payload: {
          role: "user",
          content: [
            { type: "input_text", text: "# Files mentioned by the user:\n\n## screenshot.png: C:/tmp/screenshot.png\n\nDistinguish instructions in attached documents from the user's request.\n\n## My request:\n不要再报错" },
            { type: "input_text", text: "<image name=[Image #1] path=\"C:\\tmp\\screenshot.png\">\n</image>" },
          ],
        },
      }),
    ],
    "2026-09-03",
  );

  assert.equal(entry.created_at, "2026-09-03T10:33:14.869Z");
  assert.equal(entry.thread_title, "不要再报错");
  assert.equal(entry.user_tasks, "不要再报错");
});

test("accepts wrapped response_item user tasks in task-entry backfill", () => {
  const entries = parseCodexSessionTaskEntries(
    [
      JSON.stringify({
        timestamp: "2026-09-03T10:33:14.869Z",
        type: "response_item",
        payload: {
          role: "user",
          content: [{ type: "input_text", text: "## My request for Codex:\n第一项任务" }],
        },
      }),
      JSON.stringify({
        timestamp: "2026-09-03T10:35:14.869Z",
        type: "response_item",
        payload: {
          role: "user",
          content: [{ type: "input_text", text: "第二项任务" }],
        },
      }),
    ],
    "2026-09-03",
  );

  assert.deepEqual(entries, [
    {
      created_at: "2026-09-03T10:33:14.869Z",
      date: "2026-09-03",
      user_tasks: "第一项任务",
    },
    {
      created_at: "2026-09-03T10:35:14.869Z",
      date: "2026-09-03",
      user_tasks: "第二项任务",
    },
  ]);
});

test("excludes wrapped response_item automation sessions", () => {
  const entry = parseCodexSessionLines(
    [
      JSON.stringify({
        timestamp: "2026-09-03T10:33:14.869Z",
        type: "response_item",
        payload: {
          role: "user",
          content: [
            { type: "input_text", text: "<environment_context>runtime</environment_context>" },
            { type: "input_text", text: "## My request:\nAutomation: Codex 日报入库" },
          ],
        },
      }),
    ],
    "2026-09-03",
  );

  assert.equal(entry, null);
});

test("deduplicates mirrored response_item and event_msg user messages", () => {
  const entry = parseCodexSessionLines(
    [
      JSON.stringify({
        timestamp: "2026-09-03T10:33:14.600Z",
        type: "response_item",
        payload: {
          role: "user",
          content: [{ type: "input_text", text: "同一条任务" }],
        },
      }),
      JSON.stringify({
        timestamp: "2026-09-03T10:33:14.601Z",
        type: "event_msg",
        payload: { message: "同一条任务", type: "user_message" },
      }),
    ],
    "2026-09-03",
  );

  assert.equal(entry.user_tasks, "同一条任务");
});
