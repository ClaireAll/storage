# D:\Claire\storage hydration 防护规则

在 `D:\Claire\storage` 项目中，后续修改 React/Next.js 页面时必须主动避免 hydration mismatch，尤其不要让服务端首屏渲染和客户端 hydration 首帧生成不同属性或 className。

重点检查：
- 不要在首屏渲染期间直接用 `window`、`matchMedia`、`localStorage`、浏览器系统主题等只存在于客户端的值决定 className、style、AntD token 或 DOM 属性。
- 不要在首屏渲染期间直接用 `new Date()`、`Date.now()`、`Math.random()` 等会在服务端和客户端产生不同结果的值生成可见内容或属性。
- 需要跟随系统主题、读取浏览器状态、显示当前日期时，首屏应先使用服务端可确定的稳定默认值；等组件挂载后再通过 `useEffect` 同步客户端真实值。
- 修改登录页、主题切换、日期展示、头像、Ant Design 配置、动态 className 时，都要把 hydration 风险作为默认检查项。

曾经在登录页出现过多次 `A tree hydrated but some attributes of the server rendered HTML didn't match the client properties`，根因之一是服务端按 light 渲染，而客户端首屏立刻按系统 dark 渲染，导致 className / 主题属性不一致。后续不要重复引入同类问题。
