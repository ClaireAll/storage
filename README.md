# Storage

个人物品储存/库存管理平台，用于记录物品、位置、分类、标签和图片。

## 技术栈

- Next.js 16
- React 19
- Tailwind CSS 4
- Ant Design
- 后续接入 Supabase PostgreSQL
- 后续接入阿里云 OSS
- 后续支持微信小程序客户端

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

该链接已在 `src/app/globals.css` 中全局引入。

使用图标时，在页面或组件中添加对应的 iconfont class：

```tsx
<i className="iconfont icon-xxx" />
```

其中 `icon-xxx` 替换为阿里图标库项目中对应图标的 class 名称。

如果后续在阿里图标库中新增或删除图标，需要先在 iconfont 项目中更新代码，然后同步替换 `src/app/globals.css` 里的在线链接。

## 主题配置

项目默认从 `.env.local` 读取主题配置：

```env
THEME="dark"
THEME_COLOR="#13c2c2"
```

- `THEME` 支持 `light` 和 `dark`
- `THEME_COLOR` 使用 6 位十六进制颜色，例如 `#1677ff`

右上角调色盘可以切换浅色/深色主题和主题色。修改后会通过 `/api/theme` 同步更新 `.env.local`。

## 数据库连接

项目使用服务端 PostgreSQL 连接，优先读取 `.env.local` 中的 `DATABASE_URL`。如果没有配置 `DATABASE_URL`，则读取拆分字段：

```env
DATABASE_USERNAME=
DATABASE_PASSWORD=
DATABASE_HOST=
DATABASE_PORT=5432
DATABASE_NAME=postgres
DATABASE_SSL=true
DATABASE_URL=
```

## Supabase 连接

项目已经按 Next.js + Supabase SSR 方式接入 Supabase。当前读取 `.env.local` 中的配置：

```env
NEXT_PUBLIC_SUPABASE_URL=https://sjfpgfvjdngvlnbjnzvc.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=你的 publishable key
```

服务端使用示例：

```ts
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("items").select("*");

  if (error) {
    return Response.json({ message: error.message }, { status: 500 });
  }

  return Response.json(data);
}
```

浏览器组件使用示例：

```ts
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();
```

## Supabase 官方教程式配置

项目已按 Supabase Dashboard 中 Next.js 教程的文件结构重新配置：

- `src/utils/supabase/client.ts`：浏览器组件使用的 Supabase client
- `src/utils/supabase/server.ts`：服务端组件、Server Actions、Route Handler 使用的 Supabase client
- `src/utils/supabase/middleware.ts`：刷新和同步 Supabase session
- `middleware.ts`：Next.js 根中间件入口

浏览器组件使用：

```ts
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();
```

服务端使用：

```ts
import { createClient } from "@/utils/supabase/server";

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase.from("todos").select();

  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
```

## 登录与注册

项目使用 NextAuth Credentials 登录方式：

- 登录页：`/login`
- 认证接口：`/api/users/auth/[...nextauth]`
- 注册接口：`/api/users/register`
- 用户查询接口：`/api/users`
- 注册后写入 Supabase 的 `users` 表

注册字段：

- `name`：姓名
- `phone`：手机号
- `password`：密码，最少 4 位

注册接口会将密码用 bcrypt hash 后写入 `users.password`，`id` 由数据库自动生成。`users` 表至少需要包含 `id`、`name`、`phone`、`password` 字段。

`npm install @supabase/supabase-js @supabase/ssr`

## 配置阿里云 OSS

项目使用阿里云 OSS 存储物品图片。

### 创建 Bucket

https://www.aliyun.com/product/oss
右上角-对象存储oss控制台
创建Bucket

### 跨域设置

https://oss.console.aliyun.com/bucket/oss-cn-hangzhou/claire-storage/data-security/cors
来源：http://localhost:3888
允许Methods：GET, POST, PUT, DELETE, OPTIONS, HEAD
允许Headers：\*
允许ExposeHeaders：ETag
缓存时间：600秒

### 访问控制RAM

## 工程结构说明

当前项目按路由入口、前端功能、服务端业务和通用工具分层：

```txt
src/
  app/
    api/                 # Next.js Route Handler，只保留接口入口和路由路径
    login/               # 登录页路由入口
    theme/               # 主题配置、主题控件和主题样式
    page.tsx             # 首页路由入口，负责读取 session 和首屏数据

  features/
    home/                # 首页前端页面、资料弹窗和库存入口界面
    login/               # 登录/注册页客户端组件和页面样式

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
- Supabase 连接继续使用 `src/utils/supabase`，不再使用 `src/app/database` 直连 PostgreSQL。
