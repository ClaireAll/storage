# 主页/弹窗连续上下文

- 主页中部当前在整理为：天气卡片居中显示，分类卡片改成“快捷功能卡片”。
- 首页新增入口希望放成“添加”按钮，点击后弹出新增弹窗。
- 新增弹窗布局要求：左侧上传图片，右侧先选择分类，再根据分类显示剩余属性。
- 该仓库持续偏好：保持文件组织紧凑，UI 改动避免带来无关的间距/对齐漂移，优先用现有 Ant Design / Tailwind / Less 方案。
- 当前连续会话里，主页文案已统一为“文章推荐”，不再使用“物品”。

## Codex 日报全屏滚动性能（2026-08-11）

- 症状：Codex 日报全屏后，整体纵向滚动条无法稳定显示；滚动表格或日报内容时，浏览器 CPU 会显著升高，页面出现卡顿。
- 根因一：`ScrollActivityProvider` 曾在每个 `scroll` 事件里向上遍历 DOM，并读取 `scrollHeight`、`clientHeight`、`getComputedStyle` 来识别滚动容器。复杂的全屏日报包含表格、图表和多层 flex/grid，这些同步布局读取会放大滚动成本。
- 根因二：日报组件自身曾在滚动事件里更新 React state，滚动期间可能让表格、图表和总结区域重新参与渲染。
- 根因三：全屏日报需要内部滚动，但纵向滚动容器和滚动条槽位未被显式固定；全局默认隐藏滚动条后，活动状态无法在所有浏览器中可靠恢复可见宽度。
- 修复：删除日报组件级 `onScroll` 与滚动 state；全局服务直接采用浏览器滚动事件目标，不再在热路径读取布局；支持 `scrollend` 时在滚动结束后再启动 2 秒隐藏计时，兼容回退只重置计时器；全屏 `.codex-log-dashboard` 固定 `overflow-y: auto`、`overflow-x: hidden` 和 `scrollbar-gutter: stable`，活动状态同时覆盖 Chromium 与 Firefox。
- 防复发：不要在 `scroll` 回调中调用 `getComputedStyle`、`getBoundingClientRect`、`scrollHeight`、`clientHeight`、`scrollTop` 或驱动 React state；同一滚动条可见状态只能由全局服务管理；全屏页面只保留一个明确的纵向滚动容器，父级 `overflow: hidden`，子级 `min-height: 0`、`overflow-y: auto`；改动滚动逻辑前先补充性能回归测试。
- 验证：`tests/scroll-activity-performance.test.mjs` 和 `tests/codex-log-layout.test.mjs` 通过；`npm run typecheck`、`npm run lint`、`npm run build` 通过。相关提交：`30b3545`、`c37a26b`。
