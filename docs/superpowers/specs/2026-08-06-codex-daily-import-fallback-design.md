# Codex 日报缺省会话导入设计

## 目标

让 `scripts/import-codex-daily-reports.mjs` 在未传 `--entries` 时，直接整理目标日期的 Codex Desktop session JSONL 并写入 `codex_log`。自动化每天执行时导入上海时区的昨日数据；本次目标日期为 2026-08-05。

## 兼容性

- 显式传入 `--entries` 时保留现有 JSON 导入行为。
- 未传 `--entries` 时扫描现有 session 与 archived session 目录。
- 不读取 `state_5.sqlite.threads.tokens_used` 作为每日 token 来源。
- 不删除或清空历史数据，继续复用现有指纹去重与追加逻辑。

## 数据流

1. 按目标日期筛选 session JSONL 事件。
2. 从用户与助手消息中生成 `thread_title`、`user_tasks`、`assistant_summary`。
3. 从 `event_msg` / `token_count` 的 `payload.info.last_token_usage.total_tokens` 累加每日 token。
4. 将生成的 entries 交给现有标准化、去重和 Supabase 写入函数。
5. 输出写入条数、跳过重复条数与当天 token 总数。

## 错误处理

- session 目录不存在或当天没有记录时，正常完成 0 条写入。
- 单个正在轮转或损坏的 session 文件跳过，不中断其余文件。
- Supabase 配置或写入失败时保留明确错误并返回非零退出码。

## 测试与验收

- 新增测试证明缺少 `--entries` 不再报错，并能从 session 事件生成日报。
- 保留并运行显式 `--entries` 的兼容测试。
- 验证 token 仅来自目标日期的 `token_count` 事件。
- 执行 `node scripts/import-codex-daily-reports.mjs --date 2026-08-05 --table codex_log`，报告写入、重复和 token 汇总。
