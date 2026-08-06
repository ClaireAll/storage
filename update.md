# 版本更新

## 2026-08-06 16:18:10 +08:00

- 清理 Storage 工程内无关开发过程文件：删除 `.tmp/`、`.next/`、`.agents/`、`.superpowers/`、`node_modules.bak-*` 等本地生成或过程记录目录，保留 `.codex/context/home-dashboard-context.md` 这类已入库上下文文档。
- 按要求移除已跟踪的 `tests/` 测试目录，避免仓库继续保留当前不再需要的测试脚本；`supabase/migrations` 保留作为数据库结构演进历史。

## 2026-08-06 14:55:22 +08:00

- 按 `AGENTS.md` 的组件复用准则优化低风险 UI：将编辑弹窗中的颜色选择从原生 `input[type=color]` 改为 Ant Design `ColorPicker`，保留旁侧十六进制输入联动。
- 将图库空状态中的手写添加按钮改为 Ant Design `Button type="link"`，统一组件库交互样式。
- 保持图片上传、多图粘贴、拖拽、裁剪、封面选择和 OSS 上传流程不变，仅调整与图片流程无关的组件壳层。

## 2026-08-06 14:36:34 +08:00

- 再次盘查 Storage 工程内 Less 可迁移样式，继续将首页布局、AI 助手浮层与展开布局、衣物/爱好多图弹窗、卡片操作按钮和 Codex 日报普通布局迁移到组件内 Tailwind CSS 类名。
- Codex 日报进一步复用 Ant Design `Card.classNames.body`、`Table.pagination` 和已有 Tailwind 公共片段，Less 中保留主题色、滚动条、AntD 深层选择器、全屏与特效类样式。
- 清理 `home.less`、`clothes.less` 中重复或空壳选择器，并同步更新源码断言测试，确保后续不会把已迁移的普通布局规则重新写回 Less。
- 明确保留 `base-texture.less` 背景动画、`hobby-share.less` Flame/Swiper/分享页特效、以及部分 AntD 内部覆盖样式，不做强行 Tailwind 化，避免降低可读性和可维护性。

## 2026-08-06 11:57:07 +08:00

- 优化 Storage 样式归属：将笔记阅读页的分栏、工具栏、列表、预览区布局从 `home.less` 迁移到组件内 Tailwind CSS 类名，Less 仅保留主题色、边框色和 Ant Design 内部状态覆盖。
- 将服饰/爱好通用列表中的卡片网格、卡片尺寸、详情行网格、详情文本截断等布局迁移到 `clothes-gallery.tsx` 的 Tailwind CSS 类名，减少 `clothes.less` 中可替代的布局规则。
- 补充迁移 Codex 日报普通布局样式：面板头部、图表容器、总结加载态、排行条目、表格标题单元格和表格面板高度改由 `codex-log-dashboard.tsx` 内 Tailwind CSS 类名表达。
- 修复笔记阅读组件残留中文乱码文案，并同步调整测试，确保后续不会把已迁移的布局规则重新写回 Less。
- 保留背景动画、伪元素、关键帧、主题 `color-mix` 与 Ant Design 深层选择器在 Less 中，避免把不可读或不可维护的样式硬塞进 Tailwind 任意选择器。

## 2026-08-05 10:02:21 +08:00

- 优化 Codex 日报仪表板组件结构：新增 `DashboardPanel`、`ChartPanel`、`EChart` 公共区域组件，统一面板外壳、图表初始化和空状态展示。
- 复用 Ant Design 展示组件：指标卡改用 `Card + Statistic`，最长会话改用 `List`，总结加载态改用 `Skeleton`，减少手写 DOM 结构。
- 会话记录表格改为 Ant Design `Table.pagination` 托管分页，保留时间与 Token 筛选、表头排序、总行数展示和主题化滚动条。
- 图表容器改用 `ResizeObserver` 自动 resize，提升全屏预览、窗口变化和布局切换时的 ECharts 尺寸稳定性。

## 2026-08-04 16:06:44 +08:00

- Codex 日报 Token 统计改用 Codex 桌面 usage 聚合口径；入库脚本在每日追加新记录时也会刷新已存在记录的 `token_count`，不再删除历史数据。
- 重排 Codex 日报仪表板：删除“高频任务”，第二行改为“任务与Token趋势 / 仓库占比 / 最长会话”，会话记录表格补充内部滚动、分页和总行数。
- 优化底部总结区：总结、成长、不足三块在宽屏下同排展示，并继续通过 DeepSeek 针对用户本人生成复盘内容。
- 补齐指标卡独立颜色配置：任务、仓库、估算占比、入库Token 分别使用独立 tone，卡片边框、底色、图标、标题、数值和提示图标都会跟随对应颜色，并兼容深浅色主题。

## 2026-08-04 14:35:13 +08:00

- 修正 Codex 日报总结提示词：DeepSeek 现在明确围绕用户本人输出“总结 / 成长 / 不足”，Codex 仅作为协作工具，不再被当成复盘对象。
- Codex 日报 Token 卡片改为“入库Token”，并补充口径提示：当前数值来自 `codex_log.token_count` 的日报入库估算，不等同于 Codex 桌面热力图的总使用量。
- 优化 Codex 日报表格与滚动体验：表格固定列宽并在面板内部横向滚动，新增深浅主题通用的自定义滚动条，避免内容撑出卡片。

## 2026-08-04 14:14:16 +08:00

- Codex 日报分类菜单项新增全屏预览按钮，使用 `icon-fullscreen` 图标；仅在 Codex 日报选中且分类栏展开时显示，避免影响折叠菜单的图标居中。
- 点击按钮后右侧 Codex 日报内容卡片进入浏览器全屏，支持通过 Esc 退出；全屏态继续使用 Storage 主题变量并触发布局 resize，保证图表尺寸刷新。

## 2026-08-04 12:01:08 +08:00

- 新增 `Codex日报` 分类与 `/home/codex-log` 仪表板：接入 `codex_log` 数据，展示任务、仓库、估算占比、Token、趋势图、仓库占比、高频任务、最长会话和会话记录表格。
- 引入 ECharts 绘制日报趋势与仓库分布；表格移除“类型”列和“节选”文案，支持按时间段与 Token 区间筛选，并使用 `icon-task`、`icon-store`、`icon-proportion`、`icon-token`、`icon-codex`。
- 新增 DeepSeek 日总结接口 `/api/codex-log/summary`，输出“总结 / 成长 / 不足”；日报导入脚本改为追加并去重，不再删除同日已有记录。

## 2026-08-04 10:51:19 +08:00

- 修正 Codex 日报补 token 后只剩 7 条的问题：重新明确“日报行数由当天 completed turn 决定，token usage 只作为数值属性”，不能因为 usage 匹配失败丢弃记录。
- 更新 23:59 自动化描述：排除自动化自身线程和子代理线程，按 Asia/Shanghai 当天 completed turn 建 entries；真实 usage 只有在 `turn_id` 精确匹配时写入，否则通过 `token_basis` 估算。
- 重新导入 2026-08-03 的 `codex_log`：数据库反查确认共 55 条，标题分布为 Storage 16、分析助手 15、todo 10、入口 8、review 4、learn 2；`token_count` 总计 1,117,774。

## 2026-08-04 10:31:18 +08:00

- 修正 Codex 日报 token 口径：导入脚本新增 `token_basis`、`raw_turn_text`、`source_text` 等临时估算来源，优先使用原始 turn 内容或显式 `token_count`，仅在最后兜底时才用压缩后的日报摘要估算。
- 更新 23:59 自动化描述：按上海日期过滤当天 completed turn，读取本地 usage 日志时按 `turn_id` 取最后值或最大值，避免把同一个 turn 的多条刷新日志重复相加。
- 重新导入 2026-08-03 Codex 日报：旧的 44 条历史混入记录已替换为 7 条当天可读 completed turn，真实 usage 总计 1,057,100 tokens。

## 2026-08-04 10:12:50 +08:00

- Codex 日报 `token_count` 改为可自动估算：当 entries 未提供真实 token usage 时，导入脚本会根据 `thread_title`、`user_tasks` 和 `assistant_summary` 的文本量生成保守估算值；明确传入的 `token_count`、`tokenCount` 或 `tokens` 仍优先作为真实值写入。
- 更新 23:59 自动化描述：真实 usage 不可读取时不再写 `0`，而是使用同一套文本估算规则，并在语义上视为估算值。
- 回填 2026-08-03 已有 44 条日报记录的估算 token：反查确认 `token_count` 无 0 值，总计 44,176，单条范围 864 到 1,224。

## 2026-08-04 09:56:04 +08:00

- Codex 日报入库补充 `token_count` 字段：导入脚本支持 `token_count`、`tokenCount` 和 `tokens` 输入，统一归一化为非负整数，缺省为 `0`。
- 增加 `codex_log.token_count` 迁移与测试覆盖，并更新 23:59 自动化描述：优先写入真实 token usage；若线程工具未暴露真实 usage，则写入 `0` 表示未知。
- 按新字段重新导入 2026-08-03 日报数据，反查确认共 44 条记录：分类分布为 1 类 17 条、3 类 17 条、4 类 8 条、5 类 2 条；当前 `token_count` 总和为 0。

## 2026-08-03 18:29:40 +08:00

- 修正 Codex 日报真实入库表名：默认表、迁移文件、测试和 23:59 自动化统一改为 `codex_log`，避免继续写入旧的 `codex_daily_reports` 命名。
- 对齐当前 Supabase 实际字段：输入仍兼容 `assistant_summa`，入库统一写入 `assistant_summary`；已手动执行一次 2026-08-03 日报入库并反查确认共 44 条记录。

## 2026-08-03 18:11:42 +08:00

- 新增 Codex 日报入库脚本：支持从自动化生成的摘要 JSON 中读取当天任务摘要，按仓库路径推断分类，并写入 `codex_daily_reports` 表的 `assistant_summa` 等字段。
- 增加 Codex 日报 Supabase 迁移说明：固化 `codex_daily_reports` 表结构、按用户与日期建立索引，并开启“登录用户只读自己日报”的 RLS 策略。
- 创建每天 23:59 执行的 `Codex 日报入库` 自动化：读取当天已完成的 Codex 任务摘要，跳过进行中的任务，并通过本地脚本替换写入当天日报，避免重复数据。

## 2026-07-31 15:02:10 +08:00

- 规范化 `.gitattributes` 生效后被 Git 标记为脏的行尾文件，保持源码统一使用 LF，避免合并到主分支后工作区反复出现无内容差异的修改。

## 2026-07-31 14:54:31 +08:00

- 收口爱好分享页提交前验证：同步更新图书、笔记和 OSS 上传命名相关测试断言，使测试覆盖当前多图弹窗、可选封面和中文文件名服务端兜底上传逻辑。
- 完成提交前验证链路：`tests/*.test.mjs`、`pnpm typecheck`、`pnpm lint` 和 `pnpm build` 均已执行，lint 仅保留既有未使用变量 warning。

## 2026-07-31 14:47:14 +08:00

- 完善爱好分享页交互：新增自定义左右切换按钮，支持点击上一张、下一张，并保持 Swiper 手动轮播和固定火焰外框稳定。
- 调整分享页导航按钮配色：按钮改用独立 `--hobby-share-nav-*` 色板，不再跟随主题色；分享页默认强调色不再写死蓝色。
- 新增 `.gitattributes` 固定源码行尾为 LF，避免 Windows Git 客户端在 `core.safecrlf=true` 下提交时报 `LF would be replaced by CRLF`。
- 按飞书文档规范重写爱好分享技术方案，补充摘要、方案对比、接口设计、风险、验收标准和待确认问题。

## 2026-07-31 14:08:10 +08:00

- 优化爱好分享页轮播：改为三段复制加 `slideNext` 定时推进，减少 Swiper loop 初始化导致的首屏缺图和不自动切换问题。
- 调整公开分享视觉：图片使用完整展示，左右仅保留相邻卡片，Coverflow 间距改为 `stretch: 24`，火焰上沿高度提升到 `88`。
- 补回匿名 RPC 方案所需的 Supabase 迁移 SQL，并新增“小白版”技术实现文档，说明 RPC、分享链路、SwiperJS 和 FlameWrap 的调用方式。

## 2026-07-31 02:15:28 +08:00

- 加固爱好分享创建权限：创建 RPC 仅允许服务端 `service_role` 调用，撤销 `anon` 与 `authenticated` 的直接创建权限；公开令牌解析仍保持匿名可访问。
- 新增 server-only Supabase admin client，并让通过 NextAuth 验证的创建接口仅在写入分享快照时使用高权限客户端。
- 增加兼容已执行旧迁移环境的后续权限迁移、配置文档和安全回归测试；未声称迁移已部署到真实 Supabase 项目。

## 2026-07-31 01:21:01 +08:00

- 新增爱好页面全量图片快照分享：首页分享按钮可创建带有效期和可选密码的链接，服务端通过 RPC 固化爱好图片与主题快照。
- 新增公开 Swiper Cards 分享页，展示图片和名称；活动卡片使用 Canvas UI registry 的 Flame Wrap，并继承已保存的主题快照。
- 补充分享页主题样式入口与无管理类 UI 的源码覆盖断言，完成爱好分享聚焦测试、相邻工程测试、typecheck、lint、build 及依赖、路由、乱码静态核对。

## 2026-07-30 23:06:09 +08:00

- 新增爱好页面快照分享设计规格，明确全部爱好图片、主题快照、有效期、可选密码、Swiper Cards 与 Flame Wrap 的交互和技术边界。

## 2026-07-29 19:42:47 +08:00

- 新增笔记分类，支持名称、分类和链接管理，并接入首页分类、共享列表、编辑弹窗、数据库工具和 `/api/blog`。
- 更新 iconfont 静态资源，保持分类图标和 DeepSeek 图标可用。
- 修复工程内已发现的中文乱码，并增加乱码扫描测试，避免常见乱码再次进入源码。
- 按只读库存助手设计升级 AI 助手：拆分工具 registry，新增库存搜索、缺失字段检查、库存汇总和搭配推荐工具。
- `/api/ai/chat` 支持结构化响应，AI 对话可渲染分区、物品行、建议按钮和万相生成图片。
- 更新 AI 助手、笔记分类和乱码相关测试，并通过 typecheck、lint 和 build 验证。
