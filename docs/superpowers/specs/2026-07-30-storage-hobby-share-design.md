# Storage 爱好分享页设计

## 概述

Storage 将新增爱好页面分享能力。登录用户可以从首页标题栏创建一个公开分享链接，分享当前账号下全部爱好及其全部图片。分享内容采用创建时快照，不会随着后续爱好编辑、删除或主题修改而变化。

公开页面使用 Swiper Cards Effect 展示所有图片，并在当前活动卡片上叠加 Canvas UI Flame Wrap。页面只保留图片与对应爱好名称；分享链接可以设置失效时间和可选密码。

## 目标

- 在首页标题栏的页面样式配置按钮左侧增加分享按钮。
- 分享弹窗当前只支持“爱好”，无需选择其他分类。
- 支持 `1 天`、`1 周`、`1 月`、`永不失效` 四种有效期。
- 支持可选访问密码。
- 创建链接时分享当前账号下全部爱好及其全部图片。
- 公开页背景使用创建分享时的完整主题配置。
- 使用 Swiper `EffectCards` 展示图片卡片。
- 当前活动卡片使用 Canvas UI `FlameWrap`。
- 分享页只展示图片和图片下方的爱好名称。

## 非目标

- 不支持选择部分爱好或部分图片。
- 不支持衣服、裤子、图书等其他分类。
- 不提供分享记录列表、撤销、编辑或重新生成能力。
- 不把分享页生成的内容上传到 OSS。
- 不在公开页展示价格、分类、日期、头像、标题栏、分页器或管理按钮。
- 不让已生成的分享链接自动同步后续爱好或主题修改。

## 已确认的产品规则

- 分享范围是当前账号下全部爱好。
- 每个爱好的 `pic_urls` 全部进入分享快照。
- 每张图片对应一个 Swiper 卡片；同一爱好的多张图片重复显示该爱好名称。
- 没有图片的爱好跳过，不生成空卡片。
- 当前账号全部爱好都没有图片时，创建接口返回“暂无可分享的爱好图片”。
- `1 天` 按 24 小时计算，`1 周` 按 7 天计算，`1 月` 按 30 天计算，`永不失效` 保存为空失效时间。
- 密码为空时直接访问；密码不为空时，每次重新打开或刷新页面都需要重新输入。
- 图片使用 `object-fit: contain`，保留完整比例，不裁剪、不拉伸。
- Flame Wrap 只运行在当前活动卡片上；其他堆叠卡片使用静态主题色边框。

## 推荐架构

### 1. 分享快照表

新增 `hobby_shares` 表，保存公开页面所需的最小快照：

```ts
type HobbyShareRow = {
  share_id: string;
  token: string;
  owner_id: string;
  slides: Array<{
    hobbyId: string;
    imageUrl: string;
    name: string;
  }>;
  theme: ThemeConfig;
  expires_at: string | null;
  password_hash: string | null;
  created_at: string;
};
```

数据库迁移负责：

- 启用 `pgcrypto`。
- 创建随机、不可预测且唯一的 `token`。
- 使用 `crypt` 和 Blowfish 摘要保存密码，不保存明文密码。
- 禁止匿名用户直接读取 `hobby_shares` 表。
- 提供创建分享与解析分享两个 `security definer` RPC。

`create_hobby_share` RPC 接收服务端已经校验过的用户 id、图片快照、主题快照、失效时间和可选密码，返回 `token` 与 `expires_at`。

`resolve_hobby_share` RPC 接收 `token` 和可选密码，只返回以下状态之一：

- `ready`：返回图片、主题和失效时间。
- `password_required`：链接有效但需要密码。
- `invalid_password`：密码错误。
- `expired`：链接已经失效。
- `not_found`：链接不存在。

公开调用方无法直接取得 `password_hash`。

### 2. 服务端接口

新增两个接口边界：

- `POST /api/share/hobby`
  - 使用 NextAuth 校验登录。
  - 查询当前用户的全部 hobby 与 theme。
  - 按爱好顺序和 `pic_urls` 顺序生成扁平图片快照。
  - 校验有效期和密码长度。
  - 调用 `create_hobby_share` RPC。
  - 返回当前站点下的 `/share/hobby/{token}` 路径、token 和失效时间。

- `GET|POST /api/share/hobby/[token]`
  - `GET` 不携带密码，用于直接访问无密码链接或确认密码状态。
  - `POST` 接收密码，用于解锁受保护链接。
  - 两种方法都调用 `resolve_hobby_share` RPC，并把数据库状态映射为稳定的 HTTP 响应。

分享创建接口不会接受前端传入的图片或主题快照，避免用户伪造其他账号的数据。用户 id 始终取自服务端 session。

### 3. 标题栏分享入口

新增 `HobbyShareControl`，放在 `home-view.tsx` 标题栏右侧操作区中，并位于 `ThemeControl` 左侧。

按钮使用 Ant Design 分享图标：

- 保持与页面样式配置按钮一致的 32px 方形尺寸和圆角。
- 提供 `aria-label="分享爱好页面"` 和 Tooltip。
- 使用当前主题主色。
- 点击后打开 `HobbyShareDialog`。

弹窗分为创建态和结果态。

创建态包含：

- 固定内容行：`分享内容 / 爱好`。
- 单选有效期：`1 天 / 1 周 / 1 月 / 永不失效`，默认 `1 周`。
- 可选密码输入框，最多 64 个字符。
- 取消和生成链接按钮。

结果态包含：

- 只读分享链接输入框。
- 失效时间说明；永不失效显示“永久有效”。
- 复制链接按钮。
- 新窗口预览按钮。
- 完成按钮。

请求失败时保留用户已填写的配置，并在弹窗内显示错误，不关闭弹窗。

### 4. 公开分享页

新增公开路由 `/share/hobby/[token]`，不要求登录。

页面结构固定为：

```text
主背景
  居中的 Swiper Cards
    当前图片
    图片下方名称
```

分享页不渲染首页标题栏、分类栏、AI 助手或主题纹理动画。根布局中的共享主题纹理组件在 `/share/hobby/*` 路由下直接停用。

主题快照保存完整的浅色、深色、跟随系统模式配置：

- 固定浅色或深色模式直接使用对应背景、主题色和文字色。
- 跟随系统模式通过 CSS `prefers-color-scheme` 切换，不在首次客户端渲染时读取 `window`，避免 hydration 不一致。
- Flame Wrap 使用当前公开页解析出的主题色。

### 5. Swiper 与 Flame Wrap

引入 `swiper`，公开页客户端组件使用：

- `Swiper` 与 `SwiperSlide`。
- `EffectCards`、`Keyboard`、`A11y`。
- `swiper/css` 与 `swiper/css/effect-cards`。
- `effect="cards"`、`grabCursor`、键盘切换和辅助功能提示。
- 不显示分页器、导航箭头或滚动条。

Flame Wrap 通过 Canvas UI 官方 shadcn registry 安装：

```bash
npx shadcn@latest add @canvas-ui/flame-wrap-react
```

活动卡片渲染 `FlameWrap`，非活动卡片渲染相同尺寸的静态容器。两种状态保持相同内边距、圆角和占位尺寸，切换时不能引起布局跳动。

在 `prefers-reduced-motion: reduce` 下关闭 Flame 动画并保留静态主题色边框。卡片图片添加低透明度纯黑或纯白描边，以便在不同背景上保持边界清晰。

## 数据流

1. 登录用户点击标题栏分享按钮。
2. 用户选择有效期并可选填写密码。
3. 前端调用 `POST /api/share/hobby`。
4. 接口读取当前用户的全部爱好和主题。
5. 接口把所有 `pic_urls` 扁平化为图片快照。
6. 数据库 RPC 生成 token、密码摘要和分享记录。
7. 弹窗展示完整分享链接。
8. 访客打开 `/share/hobby/{token}`。
9. 公开页解析 token；无密码时直接得到快照，有密码时显示密码输入。
10. 解锁成功后渲染主题背景、Swiper Cards 和当前活动卡片的 Flame Wrap。

## 错误与边界状态

- 未登录创建分享：返回 401，提示“请先登录”。
- 全部爱好没有图片：返回 400，提示“暂无可分享的爱好图片”。
- 有效期非法：返回 400，提示“请选择有效期”。
- 密码超过 64 个字符：返回 400，提示“密码不能超过 64 个字符”。
- 分享不存在：公开页显示“分享链接不存在”。
- 分享已失效：公开页显示“分享链接已失效”。
- 密码错误：保留输入框并显示“密码错误，请重新输入”。
- 数据库或网络错误：创建弹窗和公开页分别显示可重试错误，不暴露底层数据库信息。
- 图片加载失败：卡片显示爱好名称和“图片加载失败”，仍允许继续切换其他卡片。

## 文件边界

计划新增：

- `supabase/migrations/20260730_create_hobby_shares.sql`
- `src/app/(pages)/home/share/hobby-share-control.tsx`
- `src/app/(pages)/home/share/hobby-share-dialog.tsx`
- `src/app/(share)/share/hobby/[token]/page.tsx`
- `src/app/(share)/share/hobby/[token]/hobby-share-view.tsx`
- `src/app/api/share/hobby/route.ts`
- `src/app/api/share/hobby/[token]/route.ts`
- `src/app/api/share/hobby/share-types.ts`
- `src/components/canvasui/FlameWrap.tsx`
- `src/app/(pages)/theme/styles/hobby-share.less`
- `tests/hobby-share.test.mjs`

计划修改：

- `package.json`
- `pnpm-lock.yaml`
- `src/app/(pages)/home/home-view.tsx`
- `src/app/(pages)/theme/shared-theme-texture.tsx`
- `src/app/(pages)/theme/theme.less`
- `src/app/utils/database.ts`
- `update.md`

文件保持单一职责：标题栏入口、弹窗、公开视图、API、共享类型和数据库函数彼此分离，不继续扩大已经较大的 `home-view.tsx` 与 `clothes-gallery.tsx`。

## 测试策略

### 数据与接口

- 有效期映射覆盖 1 天、1 周、1 月和永不失效。
- 创建接口只读取当前 session 用户的数据。
- 多个爱好的多张图片按稳定顺序扁平化。
- 无图片爱好被跳过，全部无图时拒绝创建。
- 密码不会以明文写入数据库。
- 解析 RPC 覆盖 ready、password_required、invalid_password、expired、not_found。

### 前端

- 分享按钮位于 `ThemeControl` 左侧。
- 弹窗默认选择 1 周。
- 生成成功后展示复制和预览操作。
- 公开页加载 Swiper `EffectCards`。
- 所有图片都有对应名称。
- 只有活动卡片运行 `FlameWrap`。
- 无密码、密码输入、密码错误、失效和不存在状态可见。
- 跟随系统主题不产生 SSR/CSR hydration 差异。

### 验证

- `node tests/hobby-share.test.mjs`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- 桌面与移动视口浏览器截图验证。
- 公开页卡片像素检查，确认画面非空、图片比例正确、卡片不溢出。
- 鼠标拖动、触摸滑动、键盘切换、密码解锁和复制链接人工验证。

## 验收标准

- 标题栏分享按钮位于页面样式配置按钮左侧，外观与现有标题栏控件一致。
- 分享弹窗能够生成当前账号全部爱好图片的快照链接。
- 四种有效期和可选密码都按设计生效。
- 分享链接不要求登录即可访问。
- 公开页只显示图片和对应名称。
- 公开页背景使用创建分享时的主题配置。
- Swiper Cards Effect 可以通过鼠标、触摸和键盘切换。
- 当前活动卡片显示 Flame Wrap，非活动卡片没有额外 WebGL 动画。
- 图片完整显示，不拉伸、不裁剪。
- 分享不存在、已失效和密码错误都有明确状态。
- 类型检查、Lint、构建、自动化测试和浏览器验证全部通过。

## 实现约束

- 沿用 Next.js 16、React 19、Ant Design 6、Supabase 与当前主题变量。
- 所有新增类型和方法添加简洁中文用途注释。
- 用户可见文案使用 UTF-8 中文。
- 不覆盖当前工作区中与分享功能无关的未提交修改。
- 不扩大 OSS、AI 助手、分类编辑弹窗或爱好多图编辑的改动范围。
