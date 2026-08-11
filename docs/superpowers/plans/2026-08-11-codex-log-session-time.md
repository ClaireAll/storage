# Codex 日报真实会话时间 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让新入库和历史 `codex_log` 记录的 `created_at` 表示首条真实用户消息时间，而不是 Supabase 批量入库时间。

**Architecture:** 将 session JSONL 清洗和时间提取固化为可测试的工程脚本，entries 显式携带 ISO `created_at`。导入器只在时间有效时写入该字段；独立回填脚本复用同一解析结果，按日报指纹唯一匹配历史行，先 dry run 再显式 `--apply`。

**Tech Stack:** Node.js ESM、`node:test`、Supabase JS、Codex session JSONL。

## Global Constraints

- 不新增数据库字段；复用 `codex_log.created_at`。
- 会话时间来自首条清洗后、可入库的 `event_msg` / `user_message` 的事件 `timestamp`。
- 自动化 session 整条排除，其时间和 token 均不入库。
- 历史回填只更新唯一指纹匹配记录；不新增、删除或清空历史记录。
- 不修改 `codex-log-dashboard.tsx`，保留用户当前未提交改动。
- 本工程不使用 `bug-memory-workflow`、`bug-des` 或其他缺陷记忆、缺陷文案 Skill。

---

### Task 1: 固化 session entries 生成器

**Files:**
- Create: `scripts/generate-codex-daily-entries.mjs`
- Create: `tests/generate-codex-daily-entries.test.mjs`

**Interfaces:**
- Produces: `parseCodexSessionLines(lines: string[], targetDate: string): object | null`
- Produces: `generateCodexDailyEntries({ targetDate, sessionRoots }): Promise<object[]>`
- CLI: `node scripts/generate-codex-daily-entries.mjs <date> <output-json>`

- [ ] **Step 1: Write the failing parser test**

```js
test("uses the first real user event timestamp as created_at", () => {
  const entry = parseCodexSessionLines([
    JSON.stringify({ type: "session_meta", payload: { id: "thread-1", cwd: "D:\\Claire\\storage" } }),
    JSON.stringify({ timestamp: "2026-08-10T02:03:04.000Z", type: "event_msg", payload: { type: "user_message", message: "真实任务" } }),
    JSON.stringify({ timestamp: "2026-08-10T02:04:04.000Z", type: "event_msg", payload: { type: "agent_message", message: "已完成" } }),
  ], "2026-08-10");
  assert.equal(entry.created_at, "2026-08-10T02:03:04.000Z");
});
```

- [ ] **Step 2: Run the parser test and verify RED**

Run: `node --test tests/generate-codex-daily-entries.test.mjs`

Expected: FAIL because `scripts/generate-codex-daily-entries.mjs` or its export does not exist.

- [ ] **Step 3: Implement the minimal parser and CLI**

Implement the existing automation rules in one source of truth: use only `event_msg/user_message` for user tasks; only treat an independent `## My request for Codex:` line as the attachment prelude marker; strip image/context tags; exclude sessions whose first cleaned request starts with `Automation:`; use the last `event_msg/agent_message` with readable assistant fallback; sum target-day `token_count`; set `created_at` from the first accepted user event timestamp.

- [ ] **Step 4: Add focused exclusion and date tests**

```js
test("excludes automation sessions", () => {
  assert.equal(parseCodexSessionLines([
    JSON.stringify({ timestamp: "2026-08-10T02:03:04.000Z", type: "event_msg", payload: { type: "user_message", message: "Automation: Codex 日报入库" } }),
  ], "2026-08-10"), null);
});

test("ignores events outside the Shanghai target date", () => {
  assert.equal(parseCodexSessionLines([
    JSON.stringify({ timestamp: "2026-08-09T15:59:59.000Z", type: "event_msg", payload: { type: "user_message", message: "前一天任务" } }),
  ], "2026-08-10"), null);
});
```

- [ ] **Step 5: Run tests and commit**

Run: `node --test tests/generate-codex-daily-entries.test.mjs`

Expected: PASS.

Commit: `git add scripts/generate-codex-daily-entries.mjs tests/generate-codex-daily-entries.test.mjs && git commit -m "feat: generate Codex entries with session times"`

---

### Task 2: 导入器保留并更新真实时间

**Files:**
- Modify: `scripts/import-codex-daily-reports.mjs`
- Create: `tests/import-codex-daily-reports.test.mjs`

**Interfaces:**
- `normalizeCodexDailyReportEntries()` returns optional `created_at` only for valid timestamps.
- `saveCodexDailyReports()` inserts valid `created_at` and updates an existing fingerprint when token or time differs.

- [ ] **Step 1: Write failing normalization tests**

```js
test("preserves a valid session timestamp", () => {
  const [entry] = normalizeCodexDailyReportEntries([{
    created_at: "2026-08-10T02:03:04.000Z",
    thread_title: "任务",
    user_tasks: "执行任务",
  }], "2026-08-10");
  assert.equal(entry.created_at, "2026-08-10T02:03:04.000Z");
});

test("omits an invalid session timestamp", () => {
  const [entry] = normalizeCodexDailyReportEntries([{
    created_at: "invalid",
    thread_title: "任务",
    user_tasks: "执行任务",
  }], "2026-08-10");
  assert.equal("created_at" in entry, false);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/import-codex-daily-reports.test.mjs`

Expected: valid `created_at` assertion fails because the importer currently drops it.

- [ ] **Step 3: Implement minimal timestamp normalization and persistence**

Add `toIsoTimestamp(value)` returning `""` for invalid values. Spread `{ created_at }` only when valid so missing times keep the database default. Include `created_at` in the existing-row select and update payload; update a matched row when either `token_count` or valid `created_at` differs.

- [ ] **Step 4: Add a fake Supabase chain test for insert/update payloads**

Assert that a new row contains the valid ISO `created_at`, and an existing matching row receives `{ created_at, token_count }` without touching unrelated fields.

- [ ] **Step 5: Run tests and commit**

Run: `node --test tests/import-codex-daily-reports.test.mjs`

Expected: PASS.

Commit: `git add scripts/import-codex-daily-reports.mjs tests/import-codex-daily-reports.test.mjs && git commit -m "fix: persist Codex session timestamps"`

---

### Task 3: 增加安全历史回填脚本

**Files:**
- Create: `scripts/backfill-codex-log-created-at.mjs`
- Create: `tests/backfill-codex-log-created-at.test.mjs`

**Interfaces:**
- Produces: `planCreatedAtBackfill(entries, rows)` returning `{ updates, unmatched, ambiguous }`.
- CLI: `node scripts/backfill-codex-log-created-at.mjs` for dry run; add `--apply` to execute updates.

- [ ] **Step 1: Write failing unique-match test**

```js
test("plans only unique fingerprint matches", () => {
  const result = planCreatedAtBackfill(
    [{ thread_title: "任务", user_tasks: "内容", assistant_summary: "完成", created_at: "2026-08-10T02:03:04.000Z" }],
    [{ r_id: "row-1", thread_title: "任务", user_tasks: "内容", assistant_summary: "完成" }],
  );
  assert.deepEqual(result.updates, [{ r_id: "row-1", created_at: "2026-08-10T02:03:04.000Z" }]);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/backfill-codex-log-created-at.test.mjs`

Expected: FAIL because the backfill module does not exist.

- [ ] **Step 3: Implement dry-run planner and explicit apply mode**

Reuse the importer's whitespace-normalized fingerprint logic or export a shared helper. Query only `r_id,date,thread_title,user_tasks,assistant_summary,created_at`; default to dry run; in `--apply`, update only `created_at` by exact `r_id`.

- [ ] **Step 4: Add ambiguous/unmatched tests**

Assert duplicate fingerprints produce no update and increment `ambiguous`; missing fingerprints increment `unmatched`; invalid entry timestamps produce no update.

- [ ] **Step 5: Run tests and commit**

Run: `node --test tests/backfill-codex-log-created-at.test.mjs`

Expected: PASS.

Commit: `git add scripts/backfill-codex-log-created-at.mjs tests/backfill-codex-log-created-at.test.mjs && git commit -m "feat: safely backfill Codex session times"`

---

### Task 4: Dry run、执行回填并更新自动化

**Files:**
- Modify through Codex app: automation `codex`
- Modify: `C:\Users\Claire\.codex\automations\codex\memory.md`

**Interfaces:**
- Automation generation command becomes `node scripts/generate-codex-daily-entries.mjs <date> <entries-json>`.

- [ ] **Step 1: Generate all available historical entries without writing Supabase**

Run the backfill script without `--apply`; capture `updates`, `unmatched`, `ambiguous`, and invalid-time counts.

- [ ] **Step 2: Inspect dry-run targets**

Confirm every update has one `r_id`, a valid ISO `created_at`, and no automatic-session title. Stop if any fingerprint is ambiguous or the target count is unexpectedly larger than the current `codex_log` row count.

- [ ] **Step 3: Apply the exact dry-run plan**

Run: `node scripts/backfill-codex-log-created-at.mjs --apply`

Expected: only the previously reported unique matches update `created_at`.

- [ ] **Step 4: Reverse-query Supabase**

Report updated, unmatched, ambiguous, and total rows. Group each date by minute and confirm records are no longer uniformly stamped with the import minute when source session times differ.

- [ ] **Step 5: Update automation and its memory**

Update automation `codex` to call the production generator and require `created_at` from the first real user event. Preserve the previous-day rule, automation exclusion, token source, empty-day early completion, dedupe, and pollution checks. Record commands and backfill statistics in automation memory.

---

### Task 5: Project verification and delivery

**Files:**
- Modify: `update.md`

- [ ] **Step 1: Add the confirmed fix to `update.md`**

Record the root cause, session timestamp source, safe historical backfill counts, and verification result.

- [ ] **Step 2: Run focused and full verification**

Run:

```powershell
node --test tests/generate-codex-daily-entries.test.mjs tests/import-codex-daily-reports.test.mjs tests/backfill-codex-log-created-at.test.mjs
node --test tests/*.test.mjs
pnpm typecheck
pnpm lint
pnpm build
```

Expected: all tests, typecheck, lint, and build pass; report any pre-existing warnings separately.

- [ ] **Step 3: Commit only task-owned files**

Commit: `git add update.md scripts/generate-codex-daily-entries.mjs scripts/import-codex-daily-reports.mjs scripts/backfill-codex-log-created-at.mjs tests/generate-codex-daily-entries.test.mjs tests/import-codex-daily-reports.test.mjs tests/backfill-codex-log-created-at.test.mjs && git commit -m "fix: restore Codex session times"`

- [ ] **Step 4: Push `main` without disturbing unrelated working-tree changes**

Run `git status --short`, verify only the user's pre-existing unrelated changes remain, then `git push origin main`.
