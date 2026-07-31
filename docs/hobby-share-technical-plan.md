# Storage 爱好分享功能技术实现说明（小白版）

## 0. 一句话概览

“爱好分享”做的事情是：登录用户点击分享按钮，系统把当前账号下全部爱好图片和当前主题保存成一份快照，然后生成一个公开链接。别人打开这个链接时，不需要登录，只能看到这份快照，不能看到你的数据库原表，也不能修改任何内容。

## 1. RPC 是什么？

RPC 的全称是 Remote Procedure Call，可以理解成“远程调用一个函数”。

普通接口像是：前端告诉后端“我要什么数据”，后端再自己拼 SQL 去数据库查。

RPC 像是：我们先在数据库里写好一个安全函数，前端或后端只说“请执行这个函数，并把参数给你”。

在这个项目里，RPC 主要有两个：

- `create_hobby_share`：创建分享快照，生成分享 token。
- `resolve_hobby_share`：根据分享 token 读取快照内容。

为什么要用 RPC：

- 规则可以放在数据库里统一执行，比如密码、过期时间、图片数据校验。
- 可以控制权限：创建分享只能由服务端高权限 `service_role` 调用，匿名用户不能随便创建。
- 公开访问更安全：匿名用户只能调用 `resolve_hobby_share` 读取已经生成好的快照，不会直接查你的 `hobby` 表。

## 2. 分享具体是怎么实现的？

### 2.1 创建分享链接

用户在爱好页面点分享按钮后，会打开分享弹窗。

弹窗所在组件：

- `src/app/(pages)/home/share/hobby-share-control.tsx`
- `src/app/(pages)/home/share/hobby-share-dialog.tsx`

点击创建时，前端请求：

```ts
POST /api/share/hobby
```

服务端做这些事：

1. 用 NextAuth 判断当前用户是否已经登录。
2. 读取当前用户自己的爱好列表。
3. 读取当前用户当前保存的主题。
4. 把爱好里的 `pic_urls` 展开成一张张轮播图片。
5. 如果没有可分享图片，就返回错误。
6. 使用服务端高权限 Supabase client 调用 `create_hobby_share` RPC。
7. 数据库生成 token，并把 slides、theme、过期时间、密码摘要保存到 `hobby_shares` 表。
8. 接口返回 `/share/hobby/{token}` 这样的公开链接。

关键接口：

- `src/app/api/share/hobby/route.ts`
- `src/app/api/share/hobby/share-utils.ts`
- `src/app/utils/database.ts`
- `src/utils/supabase/admin.ts`

### 2.2 打开分享链接

别人打开：

```text
/share/hobby/{token}
```

页面入口：

- `src/app/(share)/share/hobby/[token]/page.tsx`

页面会调用：

```ts
resolveHobbyShare(...)
```

这个方法底层会执行数据库 RPC：

```ts
.rpc("resolve_hobby_share", {
  p_token: token,
  p_password: password || null,
})
```

如果结果是 `ready`，页面展示轮播图和标题。

如果结果不是 `ready`，会按状态展示：

- `password_required`：需要输入访问密码。
- `invalid_password`：密码错误。
- `expired`：链接已过期。
- `not_found`：链接不存在。
- `error`：读取失败。

### 2.3 为什么分享页不用登录？

因为它只读分享快照。

快照已经在创建分享时固定到了 `hobby_shares` 表里。公开页面不会直接读取原始 `hobby` 表，所以别人不能通过链接看到你后续新增、删除或修改的爱好数据。

### 2.4 已创建链接如何查看和删除？

分享弹窗打开时会请求：

```ts
GET /api/share/hobby
```

这个接口只返回当前登录用户自己创建过的分享链接摘要。

删除某个链接时请求：

```ts
DELETE /api/share/hobby/{token}
```

删除时仍然校验当前登录用户，只允许删除 `owner_id` 等于当前用户 id 的记录。

## 3. SwiperJS 的引入与调用

SwiperJS 用来做分享页中间的图片轮播。

安装依赖写在：

- `package.json`

分享页组件引入：

```ts
import type { Swiper as SwiperInstance } from "swiper";
import "swiper/css";
import "swiper/css/effect-coverflow";
import { A11y, EffectCoverflow, Keyboard } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
```

当前使用的是 Coverflow 效果：

```tsx
<Swiper
  centeredSlides
  coverflowEffect={{
    depth: 120,
    modifier: 1,
    rotate: 22,
    scale: 0.74,
    slideShadows: false,
    stretch: 24,
  }}
  effect="coverflow"
  modules={[A11y, EffectCoverflow, Keyboard]}
  slidesPerView="auto"
>
  {carouselSlides.map((slide) => (
    <SwiperSlide key={slide.carouselKey}>...</SwiperSlide>
  ))}
</Swiper>
```

为了减少首尾切换时的缺图、闪烁和初始化问题，这里没有直接使用 Swiper 自带的 `loop` 和 `autoplay`。

现在的做法是：

1. 如果有多张图，把图片数组复制成三份。
2. 初始位置放到中间那一份。
3. 用 `setInterval` 定时执行 `swiper.slideNext()`。
4. 当滑到最前或最后一份时，用 `slideTo(..., 0, false)` 无动画归位到中间那一份。

核心函数在：

- `createHobbyShareCarouselItems`
- `getInitialCarouselSlide`
- `normalizeCarouselPosition`

组件位置：

- `src/app/(share)/share/hobby/[token]/hobby-share-view.tsx`

## 4. FlameWrap 的引入与调用

FlameWrap 是一个 Canvas/WebGL 火焰外框组件，用来给中间的当前图片盖一层火焰效果。

组件位置：

- `src/components/canvasui/FlameWrap.tsx`

分享页引入：

```ts
import { FlameWrap } from "@/components/canvasui/FlameWrap";
```

分享页调用：

```tsx
<FlameWrap
  captureContent={false}
  className="hobby-share-flame-wrap"
  color={flameColor}
  height={88}
  intensity={1.05}
  melt={2}
  radius={24}
  rim={2.9}
  scale={0.62}
  smoke={0.48}
  sparkDensity={1.2}
  sparks={1.6}
  speed={0.32}
  spread={20}
  turbulence={0.62}
>
  <div className="hobby-share-flame-target" />
</FlameWrap>
```

这里有几个关键点：

- `captureContent={false}`：不把图片本身画进 FlameWrap，避免跨域图片导致 canvas 污染。
- `height={88}`：控制上方火焰高度。
- `spread={20}`：控制四周外扩范围。
- `radius={24}`：让火焰圆角和图片圆角对齐。
- `color={flameColor}`：火焰颜色来自分享快照里的主题动画色。

火焰不是放在每张轮播图片里面，而是放在一个固定 overlay 里，盖在中间当前图片上。这样切换图片时，火焰位置不会跟着 Swiper 位移，也就不容易出现错位和闪烁。

相关样式：

- `src/app/(pages)/theme/styles/hobby-share.less`

## 5. 公开分享页为什么能显示主题背景？

创建分享时，系统把当前主题也保存进分享快照。

公开页面读取到快照后，把主题色、背景色和文字色写进 CSS 变量：

```ts
--hobby-share-dark-bg
--hobby-share-dark-color
--hobby-share-dark-text
--hobby-share-light-bg
--hobby-share-light-color
--hobby-share-light-text
```

然后页面继续渲染：

- `ThemeGeometryTexture`
- `ThemeFallingLights`

所以分享页可以复用主站里的几何动画和流星动画。

## 6. 数据安全边界

这套方案的边界是：

- 创建分享：必须登录。
- 创建 RPC：只能服务端 `service_role` 调用。
- 查看分享：可以匿名访问。
- 匿名访问只能拿到分享快照，拿不到原始 `hobby` 表。
- 分享密码只保存摘要，不把原文密码返回给前端。
- 删除分享：必须登录，并且只能删除自己创建的 token。

## 7. 回归测试覆盖点

相关测试在：

- `tests/hobby-share.test.mjs`

主要覆盖：

- RPC SQL 是否存在并限制权限。
- 创建接口是否只分享当前登录用户的数据。
- 公开解析是否隐藏密码摘要。
- 分享页是否引入 Swiper Coverflow。
- 自动切换是否使用手动定时推进。
- FlameWrap 是否作为固定 overlay 使用。
- 图片是否完整展示，避免被强行裁切。
