# Storage

个人库存与资料管理应用，用来记录衣服、裤子、日用品、图书、爱好、化妆品、护肤品、笔记、知识星图、投资关注和 Codex 日报。项目包含主题系统、OSS 文件上传、AI 助手、万相图片生成、爱好分享页和 Codex 日报仪表板。

## 技术栈

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Ant Design 6
- Less
- Supabase PostgreSQL
- Supabase SSR client
- NextAuth Credentials
- 阿里云 OSS
- DeepSeek
- 阿里云百炼 / 万相
- ECharts
- React Flow（知识星图画布）
- Tiptap（节点富文本）
- d3-force（工作线程自动布局）
- Swiper
- pnpm

## 本地开发

```bash
pnpm install
pnpm dev
```

默认端口由 `.env.local` 中的 `PORT` 控制；本地常用地址是：

```txt
http://localhost:3888
```

常用校验命令：

```bash
pnpm typecheck
pnpm lint
node --test --test-concurrency=4
pnpm build
```

## 环境变量

`.env.local` 只保存在本地，不提交到 Git。线上部署时需要在 Vercel 环境变量中逐项配置。

```env
PORT=3888

AUTH_SECRET=
AUTH_TRUST_HOST=true

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

ALIYUN_OSS_ACCESS_KEY_ID=
ALIYUN_OSS_ACCESS_KEY_SECRET=
ALIYUN_OSS_BUCKET=
ALIYUN_OSS_REGION=
ALIYUN_OSS_ENDPOINT=
ALIYUN_OSS_PUBLIC_BASE_URL=

DEEPSEEK_API_KEY=

DASHSCOPE_API_KEY=
DASHSCOPE_BASE_URL=
WAN_IMAGE_MODEL=
```

说明：

- `NEXT_PUBLIC_*` 变量会暴露给浏览器，只能放公开可用的配置。
- `SUPABASE_SERVICE_ROLE_KEY` 只能在服务端使用，目前用于分享链接创建、查询、删除等高权限操作。
- `DEEPSEEK_API_KEY` 用于页面右下角 AI 助手。
- `DASHSCOPE_API_KEY` 用于万相生成搭配效果图。

## 引入阿里图标库

项目现在采用“下载文件后本地引入”的方式，不再依赖 iconfont 在线链接。

本地文件放在：

```txt
public/iconfont/iconfont.css
public/iconfont/iconfont.js
public/iconfont/iconfont.ttf
public/iconfont/iconfont.woff
public/iconfont/iconfont.woff2
```

全局 CSS 入口在根布局中通过 `<link>` 引入：

```tsx
<link href="/iconfont/iconfont.css" rel="stylesheet" />
```

彩色 symbol 图标通过 `IconfontScriptLoader` 在客户端加载：

```tsx
const iconfontScriptSrc = "/iconfont/iconfont.js";
```

使用方式：

```tsx
<i className="iconfont icon-xxx" />
```

分类图标统一使用 `CategoryIcon`，需要彩色图标时使用 `mode="symbol"`：

```tsx
<CategoryIcon name="icon-codex" mode="symbol" />
```

更新图标库时：

1. 在阿里 iconfont 项目中更新图标。
2. 下载最新代码包。
3. 用下载包里的 `iconfont.css`、`iconfont.js`、字体文件替换 `public/iconfont` 下的同名文件。
4. 刷新页面；如果浏览器缓存旧文件，执行硬刷新。

## Supabase 连接

项目使用 `@supabase/ssr` 区分浏览器、服务端和中间件场景。

浏览器组件使用：

```ts
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();
```

服务端组件和 Route Handler 使用：

```ts
import { createClient } from "@/utils/supabase/server";

const supabase = await createClient();
```

需要 service-role 权限的服务端逻辑使用：

```ts
import { createAdminClient } from "@/utils/supabase/admin";

const supabase = createAdminClient();
```

### 主要数据表

- `users`：用户信息、手机号、密码摘要、头像。
- `theme`：用户主题、颜色和背景动画配置。
- `clothes`：衣服。
- `pants`：裤子。
- `toiletries`：日用品。
- `books`：图书，支持图片和下载文件。
- `hobby`：爱好，`pic_urls` 为 JSON 图片数组。
- `cosmetic`：化妆品。
- `skincare`：护肤品。
- `blog`：笔记链接。
- `codex_log`：Codex 日报数据。
- `codex_daily_report`：Codex 自动化生成的每日统计与总结。
- `hobby_shares`：爱好分享快照。
- `atlas_graphs`：按用户保存知识星图、外观设置和待清理图片对象键。

### 知识星图：`atlas_graphs`

每位用户一条图谱记录，服务端通过 NextAuth 获取用户身份，使用 service-role 访问。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `uuid` | 主键，服务端显式写入当前登录用户 id |
| `graph` | `jsonb` | 节点、连线、分类、标签、富文本、位置、视口与外观 |
| `pending_delete_keys` | `json` | 清理失败的 OSS 对象键数组，下次保存重试 |
| `created_at` | `timestamptz` | 创建时间 |
| `update_at` | `timestamptz` | 最近保存时间，字段名沿用现有表结构 |

表创建后执行 `scripts/atlas-access.sql`：开启 RLS，并撤销 `anon`、`authenticated` 的直接访问权限。图谱只通过鉴权后的 `/api/atlas` 接口访问。

## 投资行情

投资页使用腾讯财经公开股票行情和天天基金 `FundValuationLast` 批量估值接口，主源不可用时尝试备用源。旧的基金 JSONP 估值地址已停用。

- 交易时段前台每 15 秒检查行情，收盘后至 23:00 每分钟检查，其余时段每 5 分钟检查。
- 页面隐藏或断网时暂停请求，切回前台、窗口重新获得焦点或网络恢复时补刷；市场信号与推荐规则每 5 分钟检查一次。
- 每条数据显示来源、行情时间及估值/净值状态。公开接口存在延迟，页面刷新时间不代表行情成交时间。
- 基金盘中数据为估值；没有估值时显示最近已公布净值，同一天的正式净值公布后替换估值。基金走势图展示最近 24 次公布净值。
- 快速刷新只读取当前用户的关注项和候选行情，不抓取新闻、不触发企微通知。单项失败保留最近可用数据并标记更新失败。
- 搜索与新增关注会核对来源返回的品种类别和名称；历史误分类在读取时纠正。同一数字代码的股票与基金分别处理，不以代码前缀推断品种。
- 关注项用类型标签、大字号涨跌幅和完整行情时间分层展示；净值走势与股票分时走势分别标注。
- 桌面采用「专注看盘」双栏布局：左侧关注列表联动右侧详情与行情大图，两栏等高并一起滚动；窄屏改为上下排列，支持全站深浅主题。
- 板块行情优先读取东方财富，失败后尝试新浪备用源。主备源均失败时保留最近成功值与原始时间，并显示失败状态；源时间未核实、数据过期或更新失败时，不生成方向预测或信号通知。

## 知识星图

入口位于笔记下方，路径为 `/home/atlas`。桌面支持编辑，移动端仅浏览。

- 节点支持分类、多标签、富文本和图片；连线支持名称与有向关系。
- 从连接点拖线到空白处可新增关联节点，名称在画布内输入；回车或失焦确认，Esc 或空名称取消。
- 点击连线后可在右侧关系详情直接修改名称和方向；Delete、Backspace 删除选中内容，关联连线一起删除，可撤销。
- 支持搜索、框选、多选、平移、缩放、固定节点与手动触发自动布局。
- 背景纹理、颜色、节点外观、发光、连线和标签显示设置随图谱保存。
- 使用保存按钮或 Ctrl/Cmd+S 手动保存，不自动保存；离开未保存页面时提供提醒。保存覆盖服务器上的现有图谱。
- 首次无记录时显示本地示例，确认保存前不写入数据库。
- 节点详情默认阅读，点击编辑后显示富文本工具栏；可拖动分隔线调整详情栏宽度并记住偏好，也可在页面内展开阅读。
- 正文支持表格、增删行列、表头、合并与拆分单元格，以及文字选色、主题预设和恢复默认色；阅读与编辑沿用同一份富文本结构。
- 分类选色面板的色相条右侧提供随机颜色按钮，完整 RGB 色域内随机、不限制灰暗范围且保持不透明；沿用原有撤销和手动保存流程。

图片可粘贴、拖入或选择文件，支持 `image/*`，单张不超过 5 MB。保存前使用浏览器临时地址，保存时上传到公开 OSS 路径 `atlas/{userId}/{fileName}`，文件名使用 UUID。图谱不保存图片二进制。

每次保存先写入图谱，再比较图片引用并清理不再使用的 OSS 对象；正文图片也参与引用检查。清理失败记录到 `pending_delete_keys`，下次保存重试，不运行定时清理。成功删除图片后清空本地撤销历史，避免恢复已删除资源。

### 知识回顾样课（teach）

独立样课保存在 [`docs/learning/docker-basics`](docs/learning/docker-basics)，从星图中已有的「镜像（Image）」「容器（Container）」节点出发，以 Docker 官方文档补充应用场景。

- 直接用浏览器打开 [`第一节：同一镜像，为什么是两个世界？`](docs/learning/docker-basics/lessons/0001-image-vs-container.html)，无需启动应用、登录账号或安装 Docker。
- 约 5～8 分钟，依次完成回想、图解、应用题与自己的话总结；另附可打印的速查页，支持随系统切换深浅色。
- 选择题反馈是预设解释，不是 AI 实时评分；开放题不自动评分，未完成实际作答前不记录「已掌握」。
- 页面不执行 Docker 命令、不发送或保存答案；刷新或关闭后输入会清空，不包含登录凭据或完整星图快照。
- 当前仅归档一节样课，尚未接入星图页面、每日生成、提醒或学习状态回写。

样课反馈逻辑可独立验证：

```bash
node --test docs/learning/docker-basics/tests/lesson.test.mjs
```

### 分享表：`hobby_shares`

爱好分享不是直接公开读取 `hobby` 表，而是在创建分享链接时把当前账号下的爱好图片整理成快照，写入 `hobby_shares`。

字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `token` | `text` | 分享令牌，主键，用于 `/share/hobby/[token]` |
| `owner_id` | `text` | 创建分享的用户 id |
| `slides` | `jsonb` | 分享页轮播图片快照，包含 `hobbyId`、`name`、`imageUrl` |
| `theme` | `jsonb` | 创建分享时的主题快照 |
| `expires_at` | `timestamptz` | 过期时间，空值表示永久有效 |
| `password_hash` | `text` | 可选访问密码的 bcrypt 摘要 |
| `created_at` | `timestamptz` | 创建时间 |

相关迁移：

```txt
supabase/migrations/20260730_create_hobby_shares.sql
supabase/migrations/20260731_secure_hobby_share_creation.sql
```

安全策略：

- `hobby_shares` 开启 RLS。
- 表权限从 `anon`、`authenticated` 撤销。
- 创建分享通过 `create_hobby_share` RPC 完成，只授权给 `service_role`。
- 公开访问通过 `resolve_hobby_share` RPC 完成，授权给 `anon` 和 `authenticated`。
- 删除分享通过服务端 API 使用 `service_role` 删除当前账号拥有的 token。

相关接口：

- `GET /api/share/hobby`：读取当前账号已创建的分享链接。
- `POST /api/share/hobby`：创建当前账号爱好图片快照分享。
- `GET /api/share/hobby/[token]`：无密码读取公开分享。
- `POST /api/share/hobby/[token]`：带密码读取公开分享。
- `DELETE /api/share/hobby/[token]`：删除当前账号拥有的分享链接。

公开页面：

```txt
/share/hobby/[token]
```

## 阿里云 OSS

项目使用阿里云 OSS 存储头像、物品图片和图书下载文件。数据库只保存公开 URL 和业务字段。

上传目录：

- `avatars`
- `clothes`
- `pants`
- `toiletries`
- `books`
- `hobby`
- `cosmetic`
- `skincare`
- `atlas`

上传路径按用户隔离：

```txt
{directory}/{userId}/{fileName}
```

文件命名规则：

- 图片和文件上传时优先使用业务名称作为文件名。
- 如果 OSS 中存在同名文件，自动追加 `_2`、`_3` 等后缀。
- 中文文件名会走服务端 PUT 上传，避免浏览器直传 PostObject 的编码兼容问题。
- 编辑时如果替换旧文件，服务端会尽量复用或清理对应资源。

本地开发至少配置以下 OSS 跨域规则：

```txt
来源：http://localhost:3888
允许 Methods：GET, POST, PUT, DELETE, OPTIONS, HEAD
允许 Headers：*
暴露 Headers：ETag
缓存时间：600
```

## AI 能力

### DeepSeek 助手

页面右下角的 AI 助手调用：

```txt
POST /api/ai/chat
```

模型：

```txt
deepseek-v4-flash
```

助手工具定义在：

```txt
src/app/api/ai/tools
```

它可以读取当前账号下的库存列表、搜索库存、查缺失字段、汇总库存和推荐搭配。

### Codex 日报生成

Codex 定时任务每天 00:01 导入前一天的 `codex_log` 后，使用 `human-writing` Skill 基于已入库记录生成“总结 / 成长 / 不足”，再写入 `codex_daily_report`。日报页面只读取已生成数据，不再即时调用总结接口。

自动化会补齐 `desktop_token_total`、`session_count`、`summary_model`、`token_calculated_at` 等字段；每次执行也会回填已有日志但日报不完整的日期。没有当日日志时不会创建日报。

### 万相搭配图

搭配效果图接口：

```txt
POST /api/ai/outfit-image
```

底层调用阿里云百炼 DashScope 的万相模型。默认模型：

```txt
wan2.7-image-pro
```

生成结果直接返回临时图片 URL，不上传到 OSS。

## 样式规范

- 普通布局、间距、尺寸、显隐状态优先写 Tailwind CSS，并直接写在对应组件文件中。
- Less 主要保留给主题变量、Ant Design 深层选择器、伪元素、keyframes、背景动画、Swiper/Flame 特效等 Tailwind 不适合表达的样式。
- Ant Design 组件优先使用 v6 推荐的属性和方法。
- 不重复手写 Ant Design 已有能力。
- 全工程滚动条在 `src/app/globals.css` 中统一处理：默认保留占位但视觉隐藏，滚动时显示。

## 工程结构说明

```txt
.
├─ public/
│  ├─ fonts/                 # 本地字体
│  ├─ iconfont/              # 阿里 iconfont 下载文件
│  └─ images/                # 静态图片
├─ scripts/                  # 本地维护脚本
├─ src/
│  ├─ app/
│  │  ├─ (pages)/            # 登录后应用页面
│  │  ├─ (share)/            # 公开分享页
│  │  ├─ api/                # Next.js Route Handlers
│  │  ├─ globals.css         # Tailwind 和全局基础样式
│  │  ├─ layout.tsx          # 根布局、全局 provider、iconfont 引入
│  │  └─ page.tsx            # 根路由入口
│  ├─ components/            # 跨页面组件
│  ├─ lib/                   # 通用库函数
│  ├─ types/                 # 全局类型声明
│  └─ utils/                 # 请求、OSS、Supabase 等工具
├─ supabase/
│  └─ migrations/            # 数据库迁移 SQL
├─ auth.ts                   # NextAuth 配置
├─ middleware.ts             # Supabase session 同步
├─ next.config.ts            # Next.js 配置
├─ package.json              # 脚本与依赖
└─ README.md                 # 项目说明
```

### `src/app/(pages)/common`

跨页面通用组件：

- `category-icon.tsx`：分类图标组件，支持 iconfont font class 和 symbol 彩色图标。
- `iconfont-script-loader.tsx`：客户端加载 `/iconfont/iconfont.js`。
- `scroll-activity-provider.tsx`：统一滚动条显示状态。
- `ai-assistant.tsx`：DeepSeek 浮动助手。

### `src/app/(pages)/home`

登录后的主应用区域：

- `page.tsx`：主页服务端入口，读取 session、主题、用户信息和分类内容。
- `home-view.tsx`：主页客户端组合层，负责主题容器、顶部栏、内容区和新增弹窗。
- `home-dashboard.tsx`：首页主体卡片、天气、推荐、分类菜单和内容卡片；概览默认收起，可通过右侧拉绳展开，分类栏收起后子菜单浮层仍显示文字。
- `home-profile.tsx`：头像、个人资料弹窗、密码修改和退出登录。
- `constant.ts`：首页分类、分类图标、分类枚举和展示文案。
- `item-edit-config.ts`：不同库存分类的编辑弹窗配置。

分类页面：

- `clothes/`：衣服列表、筛选、图片裁剪、上传和编辑弹窗。
- `pants/`：裤子页面，复用衣服列表和编辑能力。
- `toiletries/`：日用品页面。
- `books/`：图书页面，支持图片和下载文件。
- `hobby/`：爱好页面，支持多图。
- `cosmetic/`：化妆品页面。
- `skincare/`：护肤品页面。
- `blog/`：笔记页面，左侧列表 + 右侧预览。
- `atlas/`：知识星图画布、富文本、外观设置及工作线程自动布局。
- `codex-log/`：Codex 日报仪表板，使用 ECharts 和 Ant Design Table。
- `share/`：登录态下的爱好分享创建、查看和删除弹窗。

### `src/app/(pages)/theme`

主题系统：

- `page.tsx`：主题设置页服务端入口。
- `theme-settings-page.tsx`：主题配置页面。
- `theme-provider.tsx`：向 Ant Design 注入主题 token。
- `theme-control.tsx`：主题入口按钮。
- `shared-theme-texture.tsx`：跨页面共享背景动画。
- `theme-geometry-texture.tsx`：几何动画。
- `constants.ts` / `types.ts` / `theme-utils.ts`：主题数据、类型和工具函数。
- `theme.less`：主题 Less 聚合入口。
- `styles/`：主题、背景动画、Ant Design 深层覆盖和复杂特效样式。

### `src/app/(share)`

公开分享页面：

- `share/hobby/[token]/page.tsx`：读取分享 token 并渲染公开页。
- `share/hobby/[token]/hobby-share-view.tsx`：Swiper 轮播、FlameWrap 火焰边框、密码输入和公开展示。

### `src/app/api`

服务端接口：

- `ai/chat`：DeepSeek 助手。
- `ai/outfit-image`：万相搭配图生成。
- `atlas`：读取、保存当前用户图谱，以及清理本次未保存上传的图片。
- `blog`、`books`、`clothes`、`cosmetic`、`hobby`、`pants`、`skincare`、`toiletries`：库存分类增删改接口。
- `knowledge`：文章推荐。
- `oss/policy`：浏览器直传 OSS policy。
- `oss/upload`：服务端 OSS 上传 fallback。
- `share/hobby`：创建和列出分享链接。
- `share/hobby/[token]`：读取、带密码读取和删除分享。
- `theme`：保存主题。
- `users`、`users/profile`、`users/register`、`users/auth/[...nextauth]`：用户与认证接口。

### `src/utils`

通用工具：

- `request.ts`：浏览器请求封装。
- `oss.ts`：浏览器侧上传入口。
- `oss-server.ts`：服务端 OSS 操作。
- `supabase/client.ts`：浏览器 Supabase client。
- `supabase/server.ts`：服务端 Supabase client。
- `supabase/admin.ts`：service-role Supabase client。
- `supabase/middleware.ts`：中间件 session 同步。

### `scripts`

本地维护脚本：

- `next-with-env-port.mjs`：启动 Next.js 时读取 `.env.local` 里的端口。
- `import-codex-daily-reports.mjs`：导入 Codex 日报数据。
- `save-codex-daily-report.mjs`：基于已入库日志写入单日统计与总结，也可回读指定日报。
- `list-codex-daily-report-backfill-dates.mjs`：列出需要自动回填的日报日期。
- `rename-oss-images.mjs`：按命名规则整理 OSS 图片及数据库 URL。

### `supabase/migrations`

数据库结构迁移：

- `20260730_create_hobby_shares.sql`：创建爱好分享表和 RPC。
- `20260731_secure_hobby_share_creation.sql`：收紧分享 RPC 权限。
- `20260803_create_codex_log.sql`：创建 Codex 日报表。
- `20260804_add_codex_log_token_count.sql`：给 Codex 日报补充 token 统计字段。
- `20260812_create_codex_daily_report.sql`：创建每日统计与总结表，并补齐自动化字段。
