# Investment Workbench Design QA

Date: 2026-08-13

Reference: `C:\Users\Claire\.codex\generated_images\019feea9-05f1-77b0-af5b-25f763c07e6a\exec-a252085e-d47c-4a18-8587-a7b29eb5d0a6.png`

## Reviewed implementation

- Desktop uses a 40/60 two-column workspace (`2fr / 3fr`) with a narrower watchlist on the left.
- Watchlist rows retain the dense data-first arrangement and now render real public-data trend sequences when available.
- The desktop layout collapses to one column at 980px and individual rows collapse to labeled stacks below 720px, avoiding clipped columns.
- Existing page theme surfaces, Ant Design controls, borders, and typography are reused. Icon slots deliberately remain empty as requested.
- Public-data unavailability uses explicit empty states; it is not rendered as an active trend or live quote.

## Runtime evidence

- `node node_modules/typescript/bin/tsc --noEmit`: passed.
- `node node_modules/eslint/bin/eslint.js .`: passed.
- `node --test tests/investment-workbench.test.mjs`: 5 passed.
- `node node_modules/next/dist/bin/next build`: passed and includes `/home/investment` plus all investment API routes.
- Local route verification at `http://localhost:3888/home/investment` returned the expected authenticated redirect to `/login`; visual capture of the authenticated screen is blocked because this development browser does not have the user's login session.

## Result

final result: blocked

Authenticated visual comparison remains blocked. The build, typecheck, lint, behavior tests, and dynamic route compilation all passed.

---

# 股票搜索交互设计验收

## 视觉依据

- 设计图：`C:\Users\Claire\.codex\generated_images\01a04c13-e6ad-7fc3-9dbd-2f184a63f135\exec-b03777c3-dbb3-4934-8e91-47577953be9e.png`
- 设计图像素：1881 × 836；按 2 倍像素密度对应约 940 × 418 的页面视口。
- 实现验收视口：940 × 418，设备像素比 1。
- 对比状态：输入“芯片”，展示 3 条模糊匹配结果；首项已关注，另两项可添加。

## 对比结论

- 搜索入口：页面仅保留一个搜索框，原独立添加入口已移除。
- 浮层位置：结果浮层锚定在搜索框下方并右对齐，符合方案 2。
- 命中高亮：名称和代码中的全部匹配片段使用浅红底、红字高亮。
- 关注状态：已在列表中的结果继续显示，并以灰色勾选图标和“已关注”呈现，不可重复添加。
- 添加操作：未关注结果右侧显示红色圆形加号按钮；按钮具有明确的无障碍名称。
- 视觉一致性：沿用现有页面字体、边框、圆角、颜色变量和 Ant Design 图标；设计图中的交互层级、状态和对齐关系已还原。页面其他区域继续遵循项目既有响应式布局。

## 交互验证

- 输入关键词后，280 毫秒防抖请求返回并打开结果浮层。
- 点击“国泰 CES 半导体芯片行业 ETF 联接 C”的添加按钮后，关注数量由 1 更新为 2，该结果立即切换为“已关注”。
- 按 `Escape` 后浮层关闭，搜索词保留。
- `aria-expanded`、`aria-controls`、实时结果播报、输入框 `id` 与 `name` 均已验证。
- 生产构建预览控制台无错误、警告或浏览器问题提示。

## 修正记录

- 首轮浏览器验收发现搜索输入框缺少 `id` 或 `name` 的浏览器问题提示。
- 补充 `investment-search-input` 和 `investmentSearch` 后重新构建并复测，控制台提示清零。
- 未发现 P0、P1 或剩余 P2 视觉与交互问题。

## 最终结果

passed
