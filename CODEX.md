# Codex Project Memory

本文件是项目内的压缩上下文，用来让任何新的 Codex 会话在打开 `D:\Claire\storage` 后快速接上进度。

## 项目目标

- 项目名：Storage。
- 类型：个人物品储存 / 库存管理平台。
- 使用场景：个人自用，先做 PC Web，后续考虑微信小程序。
- 核心价值：记录物品、位置、分类、标签和图片，方便查询和管理个人库存。
- 图片策略：Supabase PostgreSQL 只存图片元数据和公开访问地址，不存图片本体；图片本体放阿里云 OSS。
- 部署方向：小程序正式上线时优先考虑阿里云部署，并处理备案等上线要求。

## 技术栈

- Next.js 16
- React 19
- Tailwind CSS 4
- Ant Design
- shadcn/ui 配置已存在
- Supabase PostgreSQL
- Supabase SSR client
- NextAuth Credentials
- 阿里云 OSS
- pnpm

## 当前目录约定

```txt
src/
  app/
    api/                 # Next.js Route Handler，只保留接口入口和路由路径
    login/               # 登录页路由入口
    theme/               # 主题配置、主题控件和主题样式
    page.tsx             # 首页路由入口，负责读取 session 和首屏数据

  features/
    home/                # 首页前端页面、资料弹窗和库存入口界面
    login/               # 登录 / 注册页客户端组件和页面样式

  server/
    oss/                 # OSS 签名等服务端逻辑
    users/               # 用户资料更新、密码校验、旧头像清理等服务端逻辑

  utils/
    request.ts           # 浏览器请求封装
    oss.ts               # 浏览器侧图片上传 OSS 工具
    supabase/            # Supabase SSR 官方结构：client/server/middleware
```

约定：

- `src/app` 主要放 Next.js 约定式路由文件，避免堆放复杂页面或业务实现。
- 前端交互和页面组件优先放到 `src/features/*`，由路由入口导入使用。
- 服务端业务逻辑优先放到 `src/server/*`，`src/app/api/*/route.ts` 只保留请求入口。
- Supabase 连接继续使用 `src/utils/supabase`，不要恢复 `src/app/database` 直连 PostgreSQL。

## 已完成进度

- 已合入 Next.js 基础骨架：Next 16、React 19、Tailwind 4、`components.json`、`src/app/page.tsx`、`globals.css`、`utils.ts` 等。
- 已接入 Supabase SSR 结构：`client.ts`、`server.ts`、`middleware.ts` 和根目录 `middleware.ts`。
- 已实现 NextAuth Credentials 登录链路：`/login`、`/api/users/auth/[...nextauth]`、`/api/users/register`、`/api/users`。
- 已实现登录 / 注册页，包含明暗主题、日期展示、登录背景图和 Ant Design 表单。
- 已实现首页登录保护，未登录跳转 `/login`。
- 已实现主题配置：读取 `.env.local`，右上角可切换明暗模式和主题色，Ant Design primary/link token 跟随主题色。
- 已实现个人资料编辑：编辑名称、展示手机号、修改密码收起展开、旧密码校验、退出登录。
- 已实现头像上传链路：弹窗本地预览，保存时上传 OSS 并写库，保存成功后删除当前用户旧头像。
- 已完成工程结构调整：删除 `src/app/database`，移除 `postgres`，拆出 `features` 和 `server`。
- README 底部已追加工程结构说明。

## 当前关键文件

- `auth.ts`：NextAuth 配置。
- `next-auth.d.ts`：NextAuth 用户字段类型扩展。
- `src/app/page.tsx`：首页路由入口，读取 session、Supabase 用户资料和主题初始值。
- `src/features/home/home-page.tsx`：首页客户端页面、资料弹窗、头像预览、退出登录。
- `src/app/login/page.tsx`：登录页服务端路由入口，已登录时跳首页。
- `src/features/login/page-client.tsx`：登录 / 注册客户端组件。
- `src/features/login/styles.ts`：登录页 Tailwind className 生成与样式常量。
- `src/server/users/profile.ts`：资料保存、旧密码校验、旧头像删除。
- `src/server/oss/policy.ts`：OSS PostObject policy 签名。
- `src/utils/oss.ts`：浏览器侧图片上传 OSS。
- `src/utils/request.ts`：浏览器请求封装。
- `src/app/theme/*`：主题读取、持久化和 UI 控件。

## 环境变量

项目依赖 `.env.local`，敏感信息不要提交。

主题：

```env
THEME="dark"
THEME_COLOR="#13c2c2"
```

Supabase：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

OSS：

```env
ALIYUN_OSS_ACCESS_KEY_ID=
ALIYUN_OSS_ACCESS_KEY_SECRET=
ALIYUN_OSS_BUCKET=
ALIYUN_OSS_REGION=
ALIYUN_OSS_ENDPOINT=
ALIYUN_OSS_PUBLIC_BASE_URL=
```

## 数据库现状

当前已使用 `users` 表，至少需要：

- `id`
- `name`
- `phone`
- `password`
- `avatar`

后续库存功能建议继续设计：

- `items`
- `categories`
- `locations`
- `tags`
- `item_images`

图片表只存 OSS key、URL、排序、所属物品等元数据，不存图片二进制。

## 项目协作偏好

- 先查看 `EXECUTION_GUIDELINES.md` 和本文件，再动代码。
- 开始任务先看 `git status --short`，不要覆盖用户已有改动。
- 修改文件前，先简短说明将要改什么。
- 不要擅自大范围重构；优先小步、清晰、贴合现有结构。
- README 新内容默认追加到底部，除非用户明确要求放到别处。
- `README.md` 使用中文。
- 类型定义和方法定义要写中文注释，说明作用和参数。
- 样式优先使用 Tailwind CSS。
- Tailwind v4 的 important 写法用类名末尾 `!`，不要把 `!` 放在类名前。
- 运行时动态样式值，例如用户选择的主题色，不要写成 Tailwind 任意值类；使用 React `style` 或受控 CSS 变量。
- React / Next.js UI 改动要主动检查 hydration mismatch 风险。

## Hydration 风险规则

在登录页、主题切换、日期展示、头像、Ant Design config、动态 `className` 或 `style` 相关改动中，默认检查 SSR / CSR 首屏一致性。

避免在首屏渲染中直接使用：

- `window`
- `matchMedia`
- `localStorage`
- `new Date()`
- `Date.now()`
- `Math.random()`

需要浏览器状态或当前日期时，先使用稳定默认值，再在 `useEffect` 里同步真实客户端值。

## 常用命令

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm build
```

本地开发默认访问：

```txt
http://localhost:3888
```

## 最近验证记录

工程结构拆分后已通过：

- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`

## 建议下一步

优先继续第二阶段：库存核心模型和页面能力。

建议顺序：

1. 设计 Supabase 表结构：物品、分类、位置、标签、物品图片。
2. 明确图片元数据字段和 OSS key 规则。
3. 实现物品列表和新增物品弹窗。
4. 实现分类 / 位置的基础管理。
5. 再考虑搜索、筛选、标签和小程序接口适配。

如果新会话不知道从哪里继续，先执行：

```bash
git status --short
pnpm typecheck
```

然后阅读本文件的“建议下一步”。
