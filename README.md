# Storage

个人库存与资料管理应用，用来记录衣服、裤子、日用品、图书、爱好、化妆品、护肤品、笔记和 Codex 日报。项目包含主题系统、OSS 文件上传、AI 助手、万相图片生成、爱好分享页和 Codex 日报仪表板。

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
- `DEEPSEEK_API_KEY` 用于页面右下角 AI 助手和 Codex 日报总结。
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
- `hobby_shares`：爱好分享快照。

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

### Codex 日报总结

Codex 日报页面调用：

```txt
POST /api/codex-log/summary
```

它会基于 `codex_log` 中的每日会话记录，请 DeepSeek 生成“总结 / 成长 / 不足”。

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
- `home-dashboard.tsx`：首页主体卡片、天气、推荐、分类菜单和内容卡片。
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
- `blog`、`books`、`clothes`、`cosmetic`、`hobby`、`pants`、`skincare`、`toiletries`：库存分类增删改接口。
- `codex-log/summary`：Codex 日报总结。
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
- `rename-oss-images.mjs`：按命名规则整理 OSS 图片及数据库 URL。

### `supabase/migrations`

数据库结构迁移：

- `20260730_create_hobby_shares.sql`：创建爱好分享表和 RPC。
- `20260731_secure_hobby_share_creation.sql`：收紧分享 RPC 权限。
- `20260803_create_codex_log.sql`：创建 Codex 日报表。
- `20260804_add_codex_log_token_count.sql`：给 Codex 日报补充 token 统计字段。
