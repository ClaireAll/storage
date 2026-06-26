# Storage

个人物品储存 / 库存管理平台，用于记录物品、位置、分类、标签和图片。

## 技术栈

- Next.js 16
- React 19
- Tailwind CSS 4
- Ant Design
- Less
- Supabase PostgreSQL
- Supabase SSR client
- NextAuth Credentials
- 阿里云 OSS
- pnpm

## 本地开发

```bash
pnpm install
pnpm dev
```

打开 http://localhost:3888。

## 引入阿里图标库

当前项目使用阿里 iconfont 的 Font class 在线链接：

```css
@import url("生成的在线链接");
```

该链接已在 `src/app/globals.less` 中全局引入。

使用图标时，在页面或组件中添加对应的 iconfont class：

```tsx
<i className="iconfont icon-xxx" />
```

其中 `icon-xxx` 替换为阿里图标库项目中对应图标的 class 名称。

如果后续在阿里图标库中新增或删除图标，需要先在 iconfont 项目中更新代码，然后同步替换 `src/app/globals.less` 里的在线链接。

## 主题配置

项目已接入主题配置能力，支持浅色、深色、跟随系统，以及浅色/深色两套调色板。主题设置页路径为 `/theme`，右上角主题按钮可进入设置页。

主题数据会通过 `/api/theme` 写入 Supabase `theme` 表，显示模式会配合 cookie 用于服务端首屏读取。Ant Design 的 primary、link、background、text token 会跟随当前主题调色板。

## Supabase 连接

项目已经按 Next.js + Supabase SSR 方式接入 Supabase。当前读取 `.env.local` 中的配置：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

浏览器组件使用：

```ts
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();
```

服务端组件、Route Handler 使用：

```ts
import { createClient } from "@/utils/supabase/server";

const supabase = await createClient();
```

## 登录与注册

项目使用 NextAuth Credentials 登录方式：

- 登录页：`/login`
- 认证接口：`/api/users/auth/[...nextauth]`
- 注册接口：`/api/users/register`
- 用户查询接口：`/api/users`
- 用户资料接口：`/api/users/profile`

注册字段：

- `name`：姓名
- `phone`：手机号
- `password`：密码，最少 4 位

注册接口会将密码用 bcrypt hash 后写入 `users.password`，`id` 由数据库自动生成。`users` 表至少需要包含 `id`、`name`、`phone`、`password`、`avatar` 字段。

## 配置阿里云 OSS

项目使用阿里云 OSS 存储物品图片和头像图片，数据库只保存图片 URL、OSS key 等元数据。

`.env.local` 需要配置：

```env
ALIYUN_OSS_ACCESS_KEY_ID=
ALIYUN_OSS_ACCESS_KEY_SECRET=
ALIYUN_OSS_BUCKET=
ALIYUN_OSS_REGION=
ALIYUN_OSS_ENDPOINT=
ALIYUN_OSS_PUBLIC_BASE_URL=
```

### 创建 Bucket

进入阿里云对象存储 OSS 控制台创建 Bucket：https://www.aliyun.com/product/oss

### 跨域设置

本地开发至少需要允许：

```txt
来源：http://localhost:3888
允许 Methods：GET, POST, PUT, DELETE, OPTIONS, HEAD
允许 Headers：*
允许 Expose Headers：ETag
缓存时间：600 秒
```

## 样式编辑准则

- 布局、间距、尺寸、显隐状态优先使用 Tailwind CSS；Ant Design 组件深度样式、主题变量、复杂选择器、动画和背景特效再放到 Less。
- Tailwind 任意值优先使用具体工具类写法，避免不必要的任意属性写法。例如颜色边框使用 `border-[color-mix(...)]`，颜色背景使用 `bg-[color-mix(...)]`，文字颜色使用 `text-[rgb(...)]`。
- Tailwind 变量工具类使用括号语法，避免把 `var(...)` 写进方括号。例如主题文字色使用 `text-(--home-theme-color)`。
- Tailwind 任意值中的透明度直接使用 `/`，避免写成下划线包裹斜杠的转义形式。例如渐变背景使用 `bg-[linear-gradient(180deg,transparent,rgb(0_0_0/64%))]`，半透明背景使用 `bg-[rgb(127_127_127/10%)]`。
- Ant Design 组件的固定宽高、图标颜色、hover/focus 状态统一放在对应 Less 中维护，不在 TSX 里叠加带 important 的尺寸类做临时覆盖。
- 主题相关颜色优先使用 `var(--home-theme-*)`、`var(--clothes-create-theme-color)` 和 `color-mix()`，避免随手增加不跟随主题的灰色。
- 修改视觉问题时先确认根因，保持改动范围小，不为了压过样式而连续堆叠覆盖规则。

## 工程结构说明

当前项目按 Next.js 路由入口、页面功能模块、服务端接口、通用工具和静态资源分层。下面说明当前仓库中主要文件的用途；`.next/`、`node_modules/`、`tsconfig.tsbuildinfo` 等生成文件不纳入维护清单。

### 根目录文件

- `.env.local`：本地环境变量文件，存放 Supabase、OSS 等敏感配置，不提交到 Git。
- `.gitignore`：Git 忽略规则。
- `auth.ts`：NextAuth 配置，处理 Credentials 登录、用户校验和 session 字段。
- `CODEX.md`：项目协作记忆，记录工程背景、约定和常用命令。
- `EXECUTION_GUIDELINES.md`：工程执行准则，约束改动范围、验证命令和注释规范。
- `eslint.config.mjs`：ESLint 配置入口。
- `middleware.ts`：Next.js 中间件入口，接入 Supabase session 同步。
- `next-auth.d.ts`：NextAuth 类型扩展，补充用户字段类型。
- `next-env.d.ts`：Next.js 自动生成的类型声明文件。
- `next.config.ts`：Next.js 配置，包含 Less/Turbopack 相关规则。
- `package.json`：项目脚本、依赖和开发依赖声明。
- `pnpm-lock.yaml`：pnpm 依赖锁定文件。
- `postcss.config.mjs`：PostCSS 配置，用于 Tailwind CSS 处理。
- `README.md`：项目说明文档。
- `tsconfig.json`：TypeScript 编译配置。

### 脚本与文档

- `scripts/next-with-env-port.mjs`：启动 Next.js 时读取环境变量端口并处理默认端口。
- `docs/codex-memory/20260612-112031-readme-append-bottom.md`：早期 README 追加内容记录。
- `docs/codex-memory/20260616-150233-storage-hydration-guard.md`：Hydration 风险和处理记录。
- `docs/codex-memory/2026-06-18T11-34-08-storage-theme-texture-context.md`：主题纹理相关上下文记录。

### 静态资源

- `public/fonts/dancing-script-700.ttf`：首页用户名称展示使用的字体资源。
- `public/images/login-hero.png`：登录页背景图。

### `src/app` 应用入口

- `src/app/favicon.ico`：站点图标。
- `src/app/globals.less`：全局样式入口，包含 Tailwind、iconfont 和基础全局样式。
- `src/app/layout.tsx`：根布局，挂载全局样式、Ant Design Registry 和共享主题纹理。
- `src/app/page.tsx`：根路径入口，统一跳转到 `/home`。

### `src/app/(pages)/common`

- `src/app/(pages)/common/category-icon.tsx`：分类 iconfont 图标组件，统一处理尺寸和外层容器。

### `src/app/(pages)/home`

- `src/app/(pages)/home/page.tsx`：`/home` 服务端页面，读取 session、用户资料和初始主题。
- `src/app/(pages)/home/home-view.tsx`：首页客户端组合组件，负责主题容器、顶部栏、主体区和弹窗组合。
- `src/app/(pages)/home/home-dashboard.tsx`：首页主体区组件，包含统计卡片、分类菜单和空状态内容。
- `src/app/(pages)/home/home-profile.tsx`：首页个人资料模块，包含头像入口、资料弹窗、头像上传预览、保存资料和退出登录。
- `src/app/(pages)/home/home-config.tsx`：首页分类和统计卡片配置。
- `src/app/(pages)/home/clothes/page.tsx`：`/home/clothes` 衣服分类页面入口。
- `src/app/(pages)/home/clothes/clothes-create-modal.tsx`：衣服新增弹窗，包含表单、图片上传、拖拽/粘贴、裁剪和保存。
- `src/app/(pages)/home/clothes/clothes-image.ts`：衣服图片工具，负责主色提取、裁剪图片生成和颜色校验。
- `src/app/(pages)/home/clothes/use-draggable-modal.ts`：新增弹窗标题栏拖拽 Hook。
- `src/app/(pages)/home/clothes/use-image-crop.ts`：图片裁剪交互 Hook，管理裁剪缩放、拖拽和样式计算。
- `src/app/(pages)/home/pants/page.tsx`：`/home/pants` 裤子分类页面入口。

### `src/app/(pages)/login`

- `src/app/(pages)/login/page.tsx`：登录页服务端入口，已登录用户会跳转到 `/home`。
- `src/app/(pages)/login/page-client.tsx`：登录/注册客户端组件，包含表单切换、提交和登录背景展示。
- `src/app/(pages)/login/styles.ts`：登录页样式 className 配置和样式片段。

### `src/app/(pages)/theme`

- `src/app/(pages)/theme/page.tsx`：主题设置页服务端入口，读取用户主题数据并传给客户端页面。
- `src/app/(pages)/theme/theme-settings-page.tsx`：主题设置客户端页面，负责模式切换、预设主题、自定义颜色、纹理选择和预览。
- `src/app/(pages)/theme/theme-provider.tsx`：主题 Provider，向 Ant Design 注入当前主题 token，并提供主题更新能力。
- `src/app/(pages)/theme/theme-control.tsx`：右上角主题设置入口按钮。
- `src/app/(pages)/theme/theme-shell-background.tsx`：将当前页面主题背景同步到 document 级样式。
- `src/app/(pages)/theme/shared-theme-texture.tsx`：跨页面共享主题纹理和纹理事件发布组件。
- `src/app/(pages)/theme/theme-geometry-texture.tsx`：几何漂浮纹理动画组件。
- `src/app/(pages)/theme/theme-utils.ts`：主题工具方法，包含颜色解析、颜色混合、可读文字色、背景色和随机动画工具。
- `src/app/(pages)/theme/constants.ts`：主题预设、纹理选项、主题数据校验和数据库行转换方法。
- `src/app/(pages)/theme/types.ts`：主题模式、调色板、纹理和数据库行类型定义。
- `src/app/(pages)/theme/theme.less`：主题样式聚合入口，引入拆分后的 Less 文件。
- `src/app/(pages)/theme/styles/base-texture.less`：全局主题纹理和基础背景样式。
- `src/app/(pages)/theme/styles/home.less`：首页主题相关样式。
- `src/app/(pages)/theme/styles/clothes.less`：衣服新增弹窗和衣服模块样式。
- `src/app/(pages)/theme/styles/profile.less`：个人资料弹窗样式。
- `src/app/(pages)/theme/styles/theme-settings.less`：主题设置页样式。

### `src/app/api`

- `src/app/api/clothes/route.ts`：衣服物品接口，处理新增衣服记录。
- `src/app/api/oss/policy/route.ts`：OSS PostObject 上传策略接口，生成上传所需签名和表单字段。
- `src/app/api/theme/route.ts`：主题保存接口，将用户主题配置写入 Supabase。
- `src/app/api/users/route.ts`：用户查询接口。
- `src/app/api/users/auth/[...nextauth]/route.ts`：NextAuth Route Handler，暴露认证接口。
- `src/app/api/users/profile/route.ts`：用户资料保存接口，处理名称、密码、头像更新和旧头像清理。
- `src/app/api/users/register/route.ts`：用户注册接口，校验并写入 Supabase users 表。

### `src/lib` 与 `src/types`

- `src/lib/utils.ts`：通用 className 合并工具，封装 `clsx` 和 `tailwind-merge`。
- `src/types/less.d.ts`：Less 文件模块声明，允许 TypeScript 识别 `.less` 导入。

### `src/utils`

- `src/utils/request.ts`：浏览器请求封装，统一处理 JSON 请求、响应解析和错误抛出。
- `src/utils/oss.ts`：浏览器侧 OSS 上传工具，负责获取 policy 并提交图片文件。
- `src/utils/supabase/client.ts`：浏览器组件使用的 Supabase client。
- `src/utils/supabase/server.ts`：服务端组件、Route Handler 使用的 Supabase client。
- `src/utils/supabase/middleware.ts`：Supabase session 刷新和同步中间件工具。

约定：

- `src/app` 主要放 Next.js 约定式路由入口，复杂页面实现拆到同级功能文件。
- `src/app/api/*` 放所有服务端接口实现，对外保持 `/api/*` 路径。
- 页面、前端 UI 交互和主题相关代码优先放到 `src/app/(pages)/*`。
- 通用请求、OSS、Supabase 连接继续放在 `src/utils`。
- 只服务于某个页面的组件和 Hook 与页面放在同一目录；跨页面复用后再上移到 `common` 或 `src/lib`。
