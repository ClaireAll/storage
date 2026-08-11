# Codex 日报真实会话时间修复设计

## 目标

Codex 日报列表的“时间”显示每条会话第一条真实用户消息在 Asia/Shanghai 下的时间，而不是日报批量写入 Supabase 的时间；同时回填现有 `codex_log` 历史记录。

## 根因

`codex_log.created_at` 默认值为 `now()`。当前 entries 和入库脚本没有传入会话时间，因此同一批日报记录都获得接近相同的入库时间。页面直接格式化 `created_at`，最终显示为自动化执行时刻（例如 `00:05`）。

## 数据来源与规则

- 会话时间只读取 session JSONL 中首条清洗后、可入库的 `event_msg` / `user_message` 的事件 `timestamp`。
- 自动化 session 继续整条排除，其时间和 token 均不入库。
- entries 增加 `created_at`，使用原始 ISO 时间戳；入库规范化时校验为有效时间。
- 新增记录显式写入 `created_at`；已有同指纹记录更新 token 时也同步修正 `created_at`。
- 页面继续使用现有 `created_at` 展示和排序，不新增数据库字段或 UI 分支。

## 历史回填

1. 遍历本机 Codex sessions 和 archived sessions，按现行清洗、自动化排除规则生成历史 entries。
2. 使用现有指纹 `thread_title + user_tasks + assistant_summary` 匹配 `codex_log`。
3. 只有唯一匹配且 session 时间有效时才更新 `created_at`；无匹配或多义匹配跳过并报告，不猜测。
4. 不新增、删除或清空历史记录；回填只更新匹配记录的 `created_at`。
5. 回填后反查数据库，报告更新、跳过、未匹配数量，并抽样确认同日记录不再共享统一入库时刻。

## 测试与验证

- 测试 entries 的有效 `created_at` 被保留并写入 Supabase payload。
- 测试无效或缺失时间不会覆盖数据库默认值或已有历史时间。
- 测试同指纹记录可更新 `created_at`，多义匹配不会被更新。
- 先验证目标测试失败，再实施最小改动并运行相关测试和项目测试。
- 历史回填先进行 dry run，确认统计和目标范围后再执行写入，随后反查 Supabase。

## 非目标

- 不新增 `session_started_at` 字段。
- 不修改日报页面视觉样式。
- 不修改用户当前在 `codex-log-dashboard.tsx` 中尚未提交的全屏按钮改动。
