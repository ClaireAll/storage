# Storage 爱好分享功能实现与问题复盘（小白版）

> 本文档用于说明 Storage 爱好分享功能的完整实现方式，并复盘从开发、视觉调试、上传、提交到 Vercel 上线过程中遇到的问题和解决过程。

## 0. 摘要

| 项目 | 内容 |
|---|---|
| 文档类型 | 技术实现说明 + 问题复盘 |
| 面向读者 | 不熟悉后端、数据库、Vercel 的业务/产品/测试/新同学 |
| 功能目标 | 当前账号下全部爱好及其全部图片可以生成公开分享链接 |
| 当前方案 | 登录用户创建快照，公开用户通过 token 只读访问快照 |
| 核心技术 | Next.js API、Supabase RPC、hobby_shares 快照表、SwiperJS、FlameWrap |
| 线上关键依赖 | Vercel 环境变量、Supabase 迁移 SQL、生产重新部署 |
| 主要风险 | 线上环境变量漏配、数据库迁移未执行、公开页面视觉回归 |

> [!IMPORTANT]
> 分享功能不是直接把原始 hobby 表暴露给别人看，而是先生成一份“快照”。别人打开链接时只能看到快照，不能看到原始数据表，也不能修改任何内容。

---

## 1. 一句话说明分享功能

爱好分享功能做的事情是：

```text
登录用户点击分享
  -> 系统读取当前账号下全部爱好图片
  -> 系统保存一份固定快照
  -> 系统生成公开链接
  -> 其他人打开链接，只能查看这份快照
```

这里的“快照”可以理解成拍照留档。

例如你今天有 10 张爱好图片，生成分享链接后，别人看到的是这 10 张图片。如果你明天又新增了图片，旧分享链接不会自动变成 11 张，除非你重新生成新的分享链接。

---

## 2. RPC 是什么？

RPC 的全称是 Remote Procedure Call，可以理解成“远程调用一个函数”。

为了更容易理解，可以这样对比：

| 方式 | 小白理解 | 本项目里的作用 |
|---|---|---|
| 普通接口 | 前端问后端要数据，后端再去数据库查 | 常规增删改查 |
| RPC | 数据库里提前写好一个安全函数，后端只负责调用它 | 创建分享快照、读取公开分享 |

本项目用了两个核心 RPC：

| RPC | 用途 | 谁可以调用 |
|---|---|---|
| create_hobby_share | 创建分享快照，生成 token | 只能服务端 service_role 调用 |
| resolve_hobby_share | 根据 token 读取分享快照 | 匿名用户可以调用 |

> [!NOTE]
> token 可以理解成分享链接里的“暗号”。别人不知道 token，就找不到对应分享内容。

为什么要用 RPC：

1. 把分享规则放在数据库里统一处理，比如过期、密码、图片数据校验。
2. 创建分享需要高权限，不能让匿名用户直接写数据库。
3. 公开页面只读取快照，不读取原始 hobby 表，数据边界更清楚。

---

## 3. 分享具体是怎么实现的？

### 3.1 整体链路

整体分成两条链路：创建分享、访问分享。

| 链路 | 用户动作 | 系统动作 | 结果 |
|---|---|---|---|
| 创建分享 | 登录用户点击分享按钮 | 读取爱好图片和主题，写入快照表 | 生成公开链接 |
| 访问分享 | 其他人打开链接 | 根据 token 读取快照 | 展示轮播页面 |

### 3.2 创建分享链接

用户在首页点击爱好分享按钮后，会打开分享弹窗。

相关文件：

| 文件 | 作用 |
|---|---|
| src/app/(pages)/home/share/hobby-share-control.tsx | 分享按钮入口 |
| src/app/(pages)/home/share/hobby-share-dialog.tsx | 分享弹窗 |
| src/app/api/share/hobby/route.ts | 创建和查询分享链接的接口 |
| src/app/utils/database.ts | 封装 Supabase 数据库调用 |
| src/utils/supabase/admin.ts | 创建 service_role 高权限客户端 |

创建时请求：

```text
POST /api/share/hobby
```

服务端执行顺序：

1. 检查当前用户是否已经登录。
2. 读取当前用户自己的爱好列表。
3. 读取当前用户保存的主题配置。
4. 把爱好里的 pic_urls 展开成一张张图片。
5. 如果没有图片，返回“暂无可分享的爱好图片”。
6. 使用 service_role 调用 create_hobby_share RPC。
7. 数据库生成 token，并保存 slides、theme、过期时间、密码摘要。
8. 接口返回公开链接。

### 3.3 打开分享链接

分享链接格式：

```text
/share/hobby/{token}
```

相关文件：

| 文件 | 作用 |
|---|---|
| src/app/(share)/share/hobby/[token]/page.tsx | 分享页服务端入口 |
| src/app/(share)/share/hobby/[token]/hobby-share-view.tsx | 分享页前端展示 |
| src/app/api/share/hobby/[token]/route.ts | 密码访问、删除分享链接 |

打开链接时，页面会调用 resolve_hobby_share RPC。

返回状态说明：

| 状态 | 小白解释 | 页面表现 |
|---|---|---|
| ready | 分享可访问 | 展示图片轮播 |
| password_required | 需要密码 | 展示密码输入框 |
| invalid_password | 密码错误 | 提示重新输入 |
| expired | 链接过期 | 展示过期提示 |
| not_found | 链接不存在 | 展示不存在提示 |
| error | 读取异常 | 展示失败提示 |

### 3.4 为什么需要 hobby_shares 表？

hobby_shares 是分享快照表。

如果没有这张表，公开链接就只能每次去读原始 hobby 表，这会带来两个问题：

| 问题 | 影响 |
|---|---|
| 链接内容会随原始数据变化 | 分享出去的内容不稳定 |
| 公开访问可能碰到权限边界 | 容易不小心暴露原始表 |

使用 hobby_shares 后：

1. 分享创建时写入一份固定快照。
2. 分享页只读取快照。
3. 删除原始爱好，不会自动修改已经生成的分享快照。
4. 删除分享链接时，只删除 hobby_shares 里的快照。

> [!TIP]
> 数据库表和 RPC 只需要在 Supabase 项目里执行一次迁移 SQL，不需要每次手动创建。

---

## 4. SwiperJS 的引入与调用

SwiperJS 用来做分享页中间的图片轮播。

### 4.1 为什么用 SwiperJS？

| 需求 | SwiperJS 解决什么 |
|---|---|
| 图片左右切换 | 提供成熟轮播能力 |
| 中间大图、两侧小图 | 使用 coverflow 效果 |
| 键盘和无障碍 | 使用 A11y、Keyboard 模块 |
| 移动端适配 | 自带触摸滑动能力 |

### 4.2 引入方式

依赖写在 package.json：

```text
swiper
```

分享页组件中引入：

```ts
import type { Swiper as SwiperInstance } from "swiper";
import "swiper/css";
import "swiper/css/effect-coverflow";
import { A11y, EffectCoverflow, Keyboard } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
```

### 4.3 当前调用方式

当前使用的是 coverflow 效果。

核心配置：

| 配置 | 作用 |
|---|---|
| effect="coverflow" | 使用中间突出、两侧倾斜的轮播效果 |
| centeredSlides | 当前图片保持在中间 |
| slidesPerView="auto" | 每张图宽度由样式控制 |
| rotate | 控制两侧图片倾斜角度 |
| depth | 控制前后空间感 |
| stretch | 控制左右图片距离 |
| slideShadows=false | 关闭 Swiper 默认阴影，避免视觉脏乱 |

### 4.4 为什么没有直接用 Swiper 自带 autoplay 和 loop？

开发过程中发现直接使用 loop/autoplay 会带来这些问题：

| 问题 | 表现 |
|---|---|
| 首屏右侧缺图 | 刚打开分享页时右侧没有相邻图片 |
| 首尾衔接不稳定 | 最后一张切回第一张时可能出现空位 |
| 自动轮播不触发 | 页面看起来静止不动 |
| 火焰位置错位 | 轮播切换后火焰和图片大小对不上 |

最终方案改成手动控制：

1. 如果有多张图，把图片数组复制成 3 份。
2. 初始位置放到中间那一份。
3. 用 setInterval 定时调用 swiper.slideNext()。
4. 滑到边界时，使用无动画 slideTo 回到中间那一份。
5. 火焰外框固定在中间，不跟着 Swiper slide 移动。

这种方案牺牲了一点实现简洁度，但换来了首尾衔接和火焰稳定。

---

## 5. FlameWrap 的引入与调用

FlameWrap 是一个 Canvas/WebGL 火焰外框组件，用于给中间主图增加火焰效果。

### 5.1 FlameWrap 放在哪里？

组件文件：

```text
src/components/canvasui/FlameWrap.tsx
```

分享页引入：

```ts
import { FlameWrap } from "@/components/canvasui/FlameWrap";
```

### 5.2 当前怎么调用？

当前不是把 FlameWrap 放到每一张图片里面，而是放成一个固定 overlay。

小白理解：

```text
Swiper 负责换图片
FlameWrap 固定盖在中间
图片在下面动
火焰不跟着跑
```

关键参数：

| 参数 | 作用 |
|---|---|
| captureContent=false | 不把远程图片画进 Canvas，避免跨域污染 |
| height=88 | 增加上方火焰高度 |
| radius=24 | 火焰圆角和图片圆角对齐 |
| spread=20 | 控制火焰向外扩散范围 |
| intensity=1.05 | 控制火焰强度 |
| color | 使用分享快照里的主题动画色 |

### 5.3 为什么要 captureContent=false？

之前遇到过 Canvas 报错：

```text
Tainted canvases may not be exported
```

小白解释：

远程图片不是当前网站自己生成的，浏览器会保护它。如果我们把远程图片画进 Canvas，再试图导出或处理，浏览器会认为不安全。

解决方式：

1. FlameWrap 只负责画火焰。
2. 图片仍然由普通 img 展示。
3. 火焰层盖在图片上面。
4. 不把图片内容捕获进 Canvas。

---

## 6. 遇到的问题和解决过程

下面是本次从开发到上线遇到的主要问题。

### 6.1 数据和上传问题

| 问题 | 现象 | 原因 | 解决方式 |
|---|---|---|---|
| 爱好需要多图 | 一个爱好可能有多张图 | 原来只有 pic_url 单图字段 | 改为 pic_urls JSON 数组 |
| 粘贴上传不稳定 | 图片粘贴后没有反应 | 上传区域和文档 paste 监听不一致 | 统一支持双击、拖拽、粘贴上传 |
| 新增图片默认选中不符合预期 | 新增占位后上方还显示旧图 | 新增动作直接触发文件选择或保留旧选择 | 新增后回到上传占位，不默认选中新图 |
| 保存时报图片读取失败 | 多图保存时读取源图异常 | 本地预览、远程图、裁剪源混在一起 | 保留源图，保存时只处理真正上传的本地文件 |
| 上传预览比例被压缩 | 图片看起来被拉伸 | 预览区域使用了不合适的填充方式 | 改为保持比例展示 |
| 中文文件名上传失败 | OSS 直传返回接口错误 | 浏览器直传 OSS 对中文 key 兼容不好 | 中文文件名走服务端上传兜底 |
| 同时上传多张图失败 | 多图一起传时偶发失败 | 上传过程和状态切换竞争 | 调整为逐张处理并保持预览状态 |
| OSS 名称重复 | 出现 name、name_2、name_3 | 同名文件需要避免覆盖 | 使用 name.ext、name_2.ext 递增命名 |

### 6.2 分享接口和数据库问题

| 问题 | 现象 | 原因 | 解决方式 |
|---|---|---|---|
| 创建分享 500 | /api/share/hobby 返回 500 | 缺少表或 RPC，或权限不对 | 新增 hobby_shares 表和两个 RPC |
| 不清楚为什么要建分享表 | 担心每次都要手动建 | 分享需要固定快照 | 用迁移 SQL，一次执行即可 |
| 匿名访问安全边界 | 公开链接不应读原始 hobby 表 | 匿名访问如果直接查表风险高 | 只开放 resolve_hobby_share RPC |
| 创建权限过大 | anon/authenticated 可能直接调创建 RPC | 初始授权不够收紧 | 仅允许 service_role 调 create_hobby_share |
| 分享链接无法查看和删除 | 已创建链接没有管理入口 | UI 初期没有列表 | 分享弹窗下方展示已有链接并支持删除 |

### 6.3 分享页视觉和轮播问题

| 问题 | 现象 | 原因 | 解决方式 |
|---|---|---|---|
| 没有流星背景 | 分享页看不到主题动画 | 公开页没有复用主题纹理 | 分享快照保存 theme，并渲染 ThemeFallingLights/ThemeGeometryTexture |
| Swiper 不自动轮播 | 页面不动 | Swiper autoplay/loop 在当前结构下不稳定 | 改为 setInterval 手动 slideNext |
| 首屏右侧缺图 | 刚进入右侧没有图片 | loop 初始化和首尾复制时机不稳定 | 图片数组复制三份，初始定位中间段 |
| 左右图被裁切 | 两侧图片显示不全 | Swiper 容器 overflow 或宽度不合理 | 容器 overflow visible，控制 slide 宽度 |
| 左右距离反复不合适 | 太远、太近都有出现 | coverflow stretch 和容器宽度需要联调 | 最终收敛到 stretch 24 和固定可视宽度 |
| 图片显示不全 | 主图上下左右被裁 | object-fit 不合适 | 改成完整展示，避免强制裁切 |
| 火焰太小 | 火焰只有一点点 | 参数高度和扩散不足 | 提高 height、spread、intensity |
| 火焰被截断 | 上下火焰被切掉 | 外层容器裁切 | 给火焰 overlay 留出空间 |
| 切换后火焰错位 | 火焰和图片大小对不上 | 火焰放在 slide 内跟着轮播动 | 改成固定 overlay 盖在中间 |
| 切换时火焰闪烁 | 每次换图重新挂载火焰 | key 和布局刷新导致重建 | 固定 FlameWrap，不随 active slide 重建 |
| 两个边框不好看 | 卡片外有多余边框 | Swiper/样式叠加 | 删除多余边框，仅保留图像和火焰 |
| 按钮配色不对 | 左右切换按钮使用主题色 | 分享页按钮需要独立风格 | 新增 --hobby-share-nav-* 独立色板 |
| 标题位置不符合预期 | 标题在卡片内显得拥挤 | 图片和文字层级不清晰 | 标题外置，图片只负责展示 |

### 6.4 本地提交和线上部署问题

| 问题 | 现象 | 原因 | 解决方式 |
|---|---|---|---|
| Git 提交报 LF/CRLF | LF would be replaced by CRLF | Windows Git safecrlf 和行尾不一致 | 新增 .gitattributes 固定源码 LF |
| 工作区反复出现脏文件 | 合并后文件无内容差异但显示修改 | .gitattributes 生效后触发行尾规范化 | 单独提交行尾规范化 |
| .env.local 能不能上传 GitHub | 希望同步环境变量 | .env.local 有密钥，不能明文进仓库 | 不提交 .env.local，只放 Vercel 环境变量 |
| 线上分享 500 | 返回“分享服务配置异常” | Vercel 生产环境读不到 SUPABASE_SERVICE_ROLE_KEY | 在 Vercel 项目环境变量补充并 Redeploy |
| Vercel 找不到新增按钮 | Environment Variables 页面没有明显新增入口 | 进入的是团队/项目变量总览，入口不明显 | 进入 storage 项目 Settings 下的 Environment Variables |
| 加了变量仍不生效 | 接口仍返回旧错误 | 旧部署不会自动读取新变量 | 到 Deployments 对最新部署执行 Redeploy |

> [!CAUTION]
> SUPABASE_SERVICE_ROLE_KEY 是高权限密钥，只能放在 Vercel 服务端环境变量里，不能写进前端代码，也不能提交到 GitHub。

---

## 7. 线上环境变量怎么理解？

.env.local 只给本地开发使用。

线上 Vercel 不会读你电脑上的 .env.local，也不会读 GitHub 里的 .env.local。

线上读取的是 Vercel 项目设置里的 Environment Variables。

| 场景 | 读取位置 |
|---|---|
| 本地 pnpm dev | .env.local |
| Vercel 线上 | Vercel Project Settings -> Environment Variables |
| GitHub 仓库 | 不保存真实密钥 |

分享功能至少需要：

| 变量 | 用途 |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | 连接 Supabase 项目 |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | 普通 Supabase 访问 |
| SUPABASE_SERVICE_ROLE_KEY | 服务端创建/删除分享快照 |
| AUTH_SECRET | NextAuth 登录会话 |
| AUTH_TRUST_HOST | 让线上 host 被信任 |

Vercel 新增变量后必须重新部署。

```text
Settings -> Environment Variables -> 保存变量
  -> Deployments
  -> 最新部署右侧 ...
  -> Redeploy
```

---

## 8. 最终方案为什么这样设计？

| 设计点 | 选择 | 原因 |
|---|---|---|
| 数据读取 | 读快照，不读原表 | 分享内容稳定，权限边界清楚 |
| 创建权限 | service_role 创建 | 避免匿名或普通用户直接写分享表 |
| 公开访问 | resolve_hobby_share RPC | 只暴露必要数据 |
| 轮播 | Swiper Coverflow | 符合中间主图、两侧预览的视觉目标 |
| 自动播放 | 手动 setInterval | 比直接 autoplay/loop 更稳定 |
| 火焰 | 固定 overlay | 避免跟随 slide 错位和闪烁 |
| 主题 | 保存 theme 快照 | 分享页可以复刻当时主题效果 |
| 环境变量 | Vercel 配置 | 密钥不进入 GitHub |

---

## 9. 测试和验证方式

当前主要测试文件：

```text
tests/hobby-share.test.mjs
```

覆盖内容：

| 验证点 | 目的 |
|---|---|
| SQL 是否创建 hobby_shares 和 RPC | 确认数据库结构存在 |
| create_hobby_share 权限 | 确认只能 service_role 创建 |
| resolve_hobby_share 权限 | 确认公开访问可读 |
| 分享接口只取当前用户数据 | 避免串号 |
| 密码摘要不返回前端 | 避免泄露 |
| Swiper Coverflow 存在 | 防止轮播实现被误删 |
| 自动切换手动推进 | 防止 autoplay 回退 |
| FlameWrap 固定 overlay | 防止火焰错位 |
| 分享页无管理类 UI | 避免公开页出现编辑/删除入口 |

上线前建议执行：

```bash
rtk node --test tests/*.test.mjs
rtk pnpm typecheck
rtk pnpm lint
rtk pnpm build
```

---

## 10. 回归检查清单

### 10.1 本地检查

- [ ] 爱好页有至少一个带图片的爱好。
- [ ] 点击分享可以打开弹窗。
- [ ] 可以创建分享链接。
- [ ] 弹窗下方能看到已创建链接。
- [ ] 可以删除已创建链接。
- [ ] 打开公开链接能看到图片轮播。
- [ ] 多张图可以自动切换。
- [ ] 左右按钮可以手动切换。
- [ ] 火焰外框不会截断、错位、闪烁。
- [ ] 分享页能显示流星或几何主题背景。

### 10.2 线上检查

- [ ] Vercel 有 SUPABASE_SERVICE_ROLE_KEY。
- [ ] Vercel 有 NEXT_PUBLIC_SUPABASE_URL。
- [ ] Vercel 有 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY。
- [ ] Vercel 有 AUTH_SECRET。
- [ ] 环境变量保存后已 Redeploy。
- [ ] Supabase 已执行 20260730_create_hobby_shares.sql。
- [ ] Supabase 已执行 20260731_secure_hobby_share_creation.sql。
- [ ] 线上 /api/share/hobby 不再返回“分享服务配置异常”。

---

## 11. 小白版故障定位表

| 你看到的问题 | 第一优先检查 |
|---|---|
| 分享服务配置异常 | Vercel 是否有 SUPABASE_SERVICE_ROLE_KEY，并且已 Redeploy |
| 生成分享链接失败 | Supabase 是否执行分享表和 RPC 迁移 |
| 读取爱好分享内容失败 | Supabase URL/key 是否指向正确项目 |
| 暂无可分享的爱好图片 | 当前账号是否有带图片的爱好 |
| 分享页不自动轮播 | Swiper 手动定时推进是否被删 |
| 分享页没有火焰 | FlameWrap 是否渲染、是否 reduced motion |
| 火焰错位 | FlameWrap 是否仍是固定 overlay |
| 左右图片缺失 | 三段复制和初始 slide 是否仍存在 |
| Git 提交行尾报错 | .gitattributes 是否存在并已规范化 |
| 线上新增变量不生效 | 是否重新部署最新 Production |

---

## 12. 后续建议

| 建议 | 价值 | 优先级 |
|---|---|---|
| 在分享接口 500 时记录更详细服务端日志 | 线上排查更快 | P0 |
| 在分享弹窗里展示更明确错误提示 | 用户不用打开 DevTools | P0 |
| 给 Vercel 环境变量写部署文档 | 避免下次漏配 | P1 |
| 给 Supabase 迁移写“执行一次即可”的说明 | 避免重复建表疑惑 | P1 |
| 给分享页做视觉回归截图 | 防止火焰和轮播再次回退 | P1 |

> [!IMPORTANT]
> 当前最容易再次踩坑的是线上环境变量：本地 .env.local 正常，不代表 Vercel 线上正常。新增或修改 Vercel 环境变量后，一定要 Redeploy。
