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
@import url("//at.alicdn.com/t/c/font_4012350_w2czu067rci.css");
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

配置完成后，可以访问 `/api/database/health` 检查连接状态。
