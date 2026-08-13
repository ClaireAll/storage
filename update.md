# 版本更新

## 2026-08-13 17:47:45 +08:00

- Restyle the Codex daily-report longest-session panel as a compact reference-style list: each row now shows the task title, a stable colored repository label, and a right-aligned Token metric with a clock icon, without rank badges or nested row cards.

## 2026-08-13

- 移除自绘覆盖式滚动条及其指针拖拽、尺寸观测和滚动时间线逻辑，统一使用浏览器原生细滚动条；滚动活动期间仅增强主题色，不再改变滚动容器尺寸。
- 更新共享滚动容器与 Codex 日报的小屏回归测试，保留表格横向滚动与滚动热路径性能约束。
- 日报最长会话区域改为紧凑行布局，减少卡片边框与小屏占用。

## 2026-08-13

- 新增投资工作台：侧栏入口进入后使用 40/60 双栏布局，左侧“我的关注”支持基金/股票筛选、代码或名称公开搜索、手工添加、删除和拖拽排序；每条关注项展示可用的股票分时或基金净值趋势。
- 右侧增加三条规则模型推荐与市场信号地图；页面按盘中、午间、开盘前、收盘后和 2026 年休市日明确展示行情时间状态，所有公开接口失败都会降级为可见的不可用状态。
- 新增工程内置规则 MD、公开网页证据抓取和文本信号；新增企微机器人设置与同日同信号去重推送。新增 `investment_notifications` 与 `investment` 安全迁移，需应用到 Supabase 后启用持久化与推送。

## 2026-08-13 13:57:56 +08:00

- Refine Codex daily-report theme chart palettes. Each built-in theme now owns a distinct eight-color chart column sequence, and the layout test rejects duplicated column hex colors across themes.

## 2026-08-13 12:04:12 +08:00

- Fix Codex daily-report chart column colors. The trend bar chart now reads the current theme's `columns` through the home theme CSS variable, cleans empty color entries before handing them to ECharts, and keeps preset theme matching stable when stored colors use different hex casing.

## 2026-08-13 11:41:41 +08:00

- Adjust the Codex daily-report metric row. Today tasks, Token, and repository cards now use one flex row with equal-width cards across the available dashboard width.

## 2026-08-13 11:25:01 +08:00

- Fix compact Codex daily-report layout and vertical scrollbar ownership. The dashboard now responds to its own container width before expanding metric and analysis cards, and the longest-session card no longer creates a nested vertical scroll area that starts midway down the page.

## 2026-08-13 11:00:13 +08:00

- Correct Codex daily-report scrollbar ownership. The report now uses one shared `OverlayScrollArea`: its fixed outer layer positions both tracks, while the inner dashboard is the only vertical and horizontal scrollport. This keeps the fullscreen vertical thumb aligned to the report frame and restores the report-level horizontal thumb in normal preview when the layout overflows.

## 2026-08-13 10:29:11 +08:00

- Remove local-only Codex working artifacts from `.tmp` and `.superpowers` before release. Historical daily-import output, one-off repair scripts, dev-server logs, and local brainstorming session state are not part of the application source or deployment.

## 2026-08-13 10:20:45 +08:00

- Fix the non-fullscreen Codex report table's missing horizontal scrollbar. The shared overlay scrollbar now supports separate vertical and horizontal viewport selectors, so the table body keeps vertical scrolling while Ant Design's table-content viewport drives horizontal overflow.

## 2026-08-13 10:00:00 +08:00

- Remove the Codex daily-report estimated-ratio metric card. The dashboard now presents three wide-screen metric cards: tasks, Token usage, and repositories; the retained data field remains available to existing API consumers.

## 2026-08-12 20:15:00 +08:00

- Replace project custom scroll areas with the shared overlay scrollbar: native tracks no longer occupy layout space; horizontal thumbs remain available when content overflows, while the current vertical thumb appears during scrolling and hides after two seconds.
- Migrate the Codex report, category menu, AI messages, blog list, image strips, share-link list, theme settings, and README preview. The fullscreen report keeps one explicit vertical scrollport and forwards wheel input from its side gutters without adding work to the scroll hot path.
- Add pointer drag, track click, keyboard access, `ResizeObserver`/`MutationObserver` metric refreshes, and browser `ScrollTimeline` thumb movement. Update the focused regression suite for the common component and fullscreen report behavior.

## 2026-08-12 18:59:19 +08:00

- Fix Codex daily-report overlay scrollbar geometry: derive the thumb height from the visible-to-total content ratio and its travel distance from the exact track length, instead of fixed viewport values. The track now aligns to the report scrollport with consistent 8px top and bottom insets.

## 2026-08-12 18:41:12 +08:00

- Fix Codex daily-report scrollbar visibility in normal preview: render the draggable overlay inside the report dashboard, bind it to the dashboard scrollport in preview and the fullscreen card scrollport in fullscreen, and synchronize only its track height through `ResizeObserver`.

## 2026-08-12 17:42:24 +08:00

- Fix Codex daily-report fullscreen scrollbar dragging: replace the non-interactive activity pseudo-element with an overlay track and draggable thumb. The thumb follows the fullscreen card scroll timeline, while track clicks and pointer dragging scroll the card without reserving layout width.

## 2026-08-12 16:42:00 +08:00

- Fix Codex daily-report fullscreen scrolling: move the only vertical scrollport from the centered dashboard body to the fullscreen card itself, so the content and both side gutters respond to the mouse wheel together. The overlay activity indicator is slightly wider, taller, and more visible without consuming layout width.

## 2026-08-12 15:38:00 +08:00

- Fix nested scroll feedback in the Skills preview: the outer overlay scrollbar is now enabled only for `/home/codex-log`, so scrolling a Markdown preview no longer draws a second indicator beside the page header.

## 2026-08-12 15:28:27 +08:00

- Fix Codex daily-report preview and fullscreen scrolling: native scrollbars no longer reserve content width, while a single overlay activity indicator remains visible during scrolling and hides two seconds after it stops.

## 2026-08-12 11:25:00 +08:00

- 修复 Codex 日报全屏滚动命中范围：完整卡片 body 作为唯一纵向滚动面，因此鼠标位于日报左右留白时也可继续滚动；原生滚动条保持零宽，滚动反馈改由覆盖式主题色细条绘制，不再压缩日报主体内容。

## 2026-08-12 11:08:00 +08:00

- 修复 Codex 日报全屏滚动仍然卡顿：滚动期间由全局 `ScrollActivityProvider` 直接给根节点添加状态类，暂停并隐藏流星、几何与页面纹理背景；停止滚动 2 秒后自动恢复。该链路不再依赖全屏伪类和 `:has()` 的整页匹配，且滚动热路径不读取布局、不驱动 React state。

## 2026-08-12 10:43:03 +08:00

- 移除 Canvas UI Frost“霜冻”背景：删除主题选项、预览与全局渲染挂载、WebGL 渲染器、滚动暂停分支、专用测试和设计文档；此前保存的 `frost` 配置会在读取时自动回落为默认背景。

## 2026-08-12 10:34:15 +08:00

- Codex 日报改为由每日自动化任务统一生成：导入 `codex_log` 成功后，使用 human-writing Skill 写入 `codex_daily_report` 的总结、成长、不足、桌面 Token 总数、会话数、总结模型和统计时间。页面仅展示已入库结果，不再即时请求总结接口。
- 新增日报回填脚本和数据库迁移；自动化任务会扫描历史 `codex_log`，只回填缺失或字段不完整的日报，且当日没有日志时不会创建日报。已回填 2026-08-03 至 2026-08-07、2026-08-10 至 2026-08-11 的真实会话日报，并过滤历史误入库的自动化任务记录。

## 2026-08-11

- 修复 Codex 日报工具栏在侧栏占宽后的桌面布局：移除 Less 中 `1280px` 起强制横排的旧规则，改由组件的 Tailwind 响应式断点控制；标题信息与筛选项在内容区不足时分行展示。
- 修复任务与 Token 趋势错误显示为 0：不再将读取失败的桌面 Token 统计缓存为 0；已缓存的 0 不会覆盖同日非零的 `codex_log.token_count`，趋势图和指标卡会回退到入库统计。
- 新增 Codex 日报布局与 Token 缓存的回归断言，并在 1440px 侧栏布局和窄屏下完成浏览器检查。

## 2026-08-11 19:36:13 +08:00

- Codex 日报页头改用与分类侧栏一致的日报日历图标，并保留主题绿色图标框以确保浅色背景下清晰可见；小屏下将搜索与刷新操作合并为同一行，日期与仓库筛选保持全宽，减少工具栏高度且不影响筛选交互。

## 2026-08-11 19:30:46 +08:00

- 修复 Codex 日报全屏纵向滚动条：全屏日报明确使用独立纵向滚动容器和稳定滚动条槽位，活动时在 Chromium 与 Firefox 中均可显示。
- 进一步降低滚动 CPU：全局滚动监听直接使用浏览器事件目标，移除每帧的尺寸与样式读取；支持 `scrollend` 的浏览器在滚动结束后才启动 2 秒隐藏计时。

## 2026-08-11 19:19:32 +08:00

- 修复 Codex 日报表格滚动卡顿：移除滚动事件触发的日报 React 状态更新，避免表格、图表和总结区域在滚动中重复参与渲染。
- 优化全局滚动条活动监听：同一滚动容器连续滚动时复用已识别结果，仅延长隐藏计时；补齐 Chromium 的活动滚动条样式，保持滚动停止 2 秒后隐藏。

## 2026-08-11 19:08:00 +08:00

- 优化 Codex 日报布局：会话记录表格在常规页面提升至 360px，在全屏模式按视口高度自适应，避免挤出可视区域。
- 修复全屏浏览的纵向滚动反馈：日报区域滚动时显示主题色半透明滚动条，停止 2 秒后自动隐藏；会话表格和总结面板禁止被弹性布局压缩，确保总结始终可滚动查看。

## 2026-08-11 18:47:51 +08:00

- 优化笔记阅读器布局：将左侧列表和右侧预览拆分为独立区域，增加带无障碍属性的圆形收起/展开按钮；收起后预览区域自动占满内容宽度，笔记内容卡片同时允许该控制显示在外侧间距中。
- 清理 `components.json` 中未使用的空 registry 配置。

## 2026-08-11 14:58:57 +08:00

- 优化 Codex 日报会话记录表格：会话、任务与回答简述不再截断，改为在单元格内自然换行并尽量完整展示；移除这三列及排序图标的悬浮提示，保留分页、排序与窄屏横向滚动能力。

## 2026-08-11 14:28:08 +08:00

- 修复 Codex 日报被选中时父级子菜单整体缩放的问题：父级分类不再因任意子项处于激活状态而应用缩放，仅由日报、Plugin、Skills 等实际被选中的叶子项自身展示强调效果。

## 2026-08-11 14:09:06 +08:00

- 修复 Codex 日报会话记录时间统一显示为入库时刻的问题：从 Codex session JSONL 中提取每条真实用户请求的原始时间，优先按“日期 + 任务正文”唯一匹配历史记录，再以整段会话匹配兜底；重复或无法唯一对应的内容保持不变。
- 已安全回填 53 条历史记录并复查为 0 条待更新；全程未新增、删除或猜测任何会话记录时间。

## 2026-08-11 11:51:32 +08:00

- Codex 日报接入 `codex_daily_report` 缓存：加载时优先读取同用户同日期的真实 Token 与 DeepSeek 总结；缺失时才扫描本机 Codex 会话、生成总结并回写。将日报范围内的会话记录查询合并为一次，缓存命中后不再自动请求 DeepSeek。

## 2026-08-11 10:42:02 +08:00

- 主题设置页改为自身承接纵向滚动并隐藏原生滚动条，避免页面出现滚动条而不影响继续浏览全部配置；删除主题面板中残留的“使用浅色、深色，或匹配系统设置”说明及对应无用样式。

## 2026-08-11 10:30:07 +08:00

- 主题设置标题栏进一步与主页同高：固定为 44px 单行布局，删除顶部“使用浅色、深色，或匹配系统设置”说明，返回与保存操作在窄屏下仍保持右侧同行。

## 2026-08-11 10:19:15 +08:00

- 主题设置页标题栏改为直接复用主页的透明玻璃外壳：同步当前调色板到主页标题栏变量，移除原有不透明覆盖规则，保留标题、返回与保存操作的响应式布局。

## 2026-08-11 09:56:08 +08:00

- 刷新本地阿里 Iconfont 资源，并同步更新 `icon-plugin` 图标字形。
- 继续规范组件内 Tailwind CSS 写法：首页、AI 助手、图片编辑与图库、Codex 日报、笔记预览、登录页和主题设置页将可替换的任意数值与旧式写法收敛为标准 utility、现代 CSS 变量语法、`has-*` 变体和 `scrollbar-gutter-stable`；同步更新分类侧栏断言，保持既有布局与交互不变。

## 2026-08-10 20:08:00 +08:00

- Stabilize scrollbar rendering in Chromium: keep the horizontal thumb independently visible, apply the active theme color through `scrollbar-color` only to the current vertical scroll container, and retain the two-second post-scroll hide behavior.

## 2026-08-10 19:36:00 +08:00

- Fix Chromium scrollbar rendering: isolate `scrollbar-width` and `scrollbar-color` to a non-WebKit fallback so axis-specific horizontal and vertical thumb styles can render normally.

## 2026-08-10 19:22:00 +08:00

- Fix nested preview scrollbar targeting: remove speculative wheel-based activation, rely on real scroll events, and clear the previous vertical scrollbar when the pointer enters an embedded preview frame.

## 2026-08-10 19:10:00 +08:00

- Refine scrollbar behavior: use a lighter theme tint, keep horizontal scrollbar thumbs visible when present, and reveal only the one vertical scrollbar that is actively scrolling.

## 2026-08-10 18:58:00 +08:00

- Fix the global scrollbar color source: publish the active theme accent to the document root and apply it to both the root scroller and nested scroll containers, preventing native gray/white fallback colors.

## 2026-08-10 18:40:01 +08:00

- Fix the active scrollbar thumb color scope: resolve the semi-transparent theme color on each scrolling element so it remains visible while scrolling in themed pages.
- Add the project workflow rule that code changes in this repository do not use `bug-memory-workflow`, `bug-des`, or other defect-memory and defect-copywriting Skills.

## 2026-08-10 18:24:35 +08:00

- Refine global scrollbar behavior: keep the themed, semi-transparent scrollbar thumb visible for two seconds after scrolling ends, then hide it while preserving its layout gutter.
- Prevent horizontal overflow in the home category sidebar by constraining the menu viewport and matching the Ant Design menu width to its container.

## 2026-08-10 18:06:33 +08:00

- Add reusable GitHub README previews for the Codex Plugin and Skills sections: fetch GitHub-rendered Markdown server-side, render it in the current theme with readable tables, code blocks, and scrolling content, and provide a GitHub fallback when loading fails.

## 2026-08-10 16:17:36 +08:00

- Fix the Codex sidebar interaction: preserve its initial expanded state while allowing the user to collapse it on any child route, and make the category list independently scrollable when its entries exceed the available height.

## 2026-08-10 15:28:45 +08:00

- Fix the Codex sidebar group visibility: replace one-time `defaultOpenKeys` with controlled Ant Design `Menu.openKeys`, keep the Codex parent expanded while a Codex child route is active, and ensure the newly added Skills entry remains visible under the Codex group.

## 2026-08-10 15:12:03 +08:00

- Add a Codex expandable category group in the home sidebar: keep Codex as a parent-only node, rename the daily report entry to 日报 with `icon-daily-report`, add Plugin and Skills child nodes with their new iconfont assets, and provide matching placeholder pages for the new routes.

## 2026-08-10 14:34:24 +08:00

- Refine the glass home title bar geometry: increase the header/avatar breathing room, keep the brand text truncatable, prevent the action buttons from shrinking, make uploaded avatars render without the theme-color fill behind them, and restrict reserved scrollbar gutters to real scroll containers so the right edge no longer looks cut off.

## 2026-08-10 14:18:35 +08:00

- Fix the glass home title bar clipping regression: remove the header overflow clipping that cut off the profile avatar and right-side actions, keep the brand area flexible, and prevent the action buttons from shrinking.

## 2026-08-10 14:09:21 +08:00

- Restore the home title bar to a transparent glass style: lower the header tint opacity, add backdrop blur/saturation, subtle inner highlights, a soft bottom border, and an explicit z-index so the animated background can show through cleanly.

## 2026-08-10 10:27:37 +08:00

- Apply ponytail-style code reduction to repeated image-item API routes: consolidate clothes, pants, toiletries, cosmetic, and skincare create/update/delete logic into one shared route helper, keep each route as a compact config, and remove the leftover users debug log.
- Code volume comparison: tracked code files went from 20,907 lines to 20,307 lines, reducing 600 lines while preserving typecheck, lint, and production build.

## 2026-08-10 10:19:31 +08:00

- Rewrite README.md with the current project documentation: local Alibaba iconfont files, Supabase connection and hobby_shares/RPC sharing flow, OSS/AI notes, and refreshed project structure.

## 2026-08-07 16:56:53 +08:00

- Refine the global scrollbar skin: hide native white tracks, buttons, track pieces, and corners; keep the reserved gutter while using a subtle transparent thumb that appears only during scroll activity.

## 2026-08-07 14:47:31 +08:00

- Unify scrollbar styling across the project: scrollbars keep their layout gutter, stay visually hidden by default, and reveal only while scrolling with a global scroll activity state.
- Remove Codex daily report's local visible scrollbar overrides so Ant Design tables and custom scroll containers follow the same global behavior.

## 2026-08-07 14:25:42 +08:00

- 修复 Codex 日报全屏预览布局变形：为全屏态补充独立 flex、高度、滚动、图表、指标卡、表格和总结区尺寸约束，避免普通页面 min-height 与 gap 在全屏下挤压变形。
- 加固全屏切换后的图表尺寸刷新：进入或退出全屏后分阶段派发 resize 事件，确保 ECharts 在浏览器完成全屏过渡后重新计算容器尺寸。

## 2026-08-11 13:53:39 +08:00

- 首页分类侧栏支持按账号保存叶子分类可见性：设置模式使用主题色设置和眼睛图标管理分类，隐藏状态写入 `theme.hidden_category_keys`，退出后自动保存并在失败时恢复已保存状态。

## 2026-08-07 11:58:17 +08:00

- 修复启动时根节点属性级 hydration mismatch 提示：在根布局的 `html` 与 `body` 上补充 `suppressHydrationWarning`，用于兼容浏览器插件、主题初始化等客户端首屏属性差异。

## 2026-08-07 11:19:29 +08:00

- 使用 `baseline-ui` 思路优化 Codex 日报页面：降低面板边框和背景噪音，统一工具栏、指标卡、图表区、最长会话、表格和总结区的间距、高度与卡片层级。
- Codex 日报继续优先使用组件内 Tailwind CSS 表达布局，补充刷新按钮无障碍标签，并保留 Ant Design 的表格、日期、选择器、输入框、空状态和统计组件能力。

## 2026-08-07 10:47:14 +08:00

- 修复 Codex 日报页面 Ant Design v6 废弃警告：将“最长会话”区域从已废弃的 `List` 组件改为原生 `ul/li` 结构，并继续使用 Tailwind CSS 保持原有列表布局、滚动条和空状态展示。

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
## 2026-08-11 11:55:27 +08:00

- 修复 Codex 日报会话时间：`codex_log.created_at` 现在使用目标日首条真实用户消息的 session JSONL 时间戳，而不是 Supabase 批量入库时间；日报列表中的时间与排序因此反映真实会话时间。
- 新增可测试的日报 entries 生成器，并保留既有的附件清洗、自动化会话排除、上海日期过滤、agent 摘要和 event token 统计规则。
- 导入器会写入有效会话时间，并在同指纹记录的 token 或会话时间变化时精确更新对应字段；无效时间不会覆盖数据库默认值。
- 新增默认 dry run 的历史回填工具，仅对日期和内容指纹均唯一的记录更新 `created_at`。本次扫描 122 条记录与 45 条 session entries，安全回填 24 条，跳过 21 条未匹配记录，0 条多义或无效记录；未新增或删除任何数据。
- Supabase 反查确认 2026-08-05、2026-08-06、2026-08-07、2026-08-10 已分别拥有 4、5、6、13 个不同会话时间；自动化改为使用生产生成器持续写入真实时间。
- 验证通过：33 个 Node 测试、TypeScript、ESLint 和 Next.js 生产构建。
