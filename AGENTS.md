# AGENTS.md instructions for D:\Claire\storage

<INSTRUCTIONS>
These AGENTS.md instructions replace all previously provided AGENTS.md instructions.

@C:\Users\Claire\.codex\RTK.md

Personal Codex skills live in `D:\Claire\skills`. Prefer this directory when installing, migrating, or looking up user skills. Keep `C:\Users\Claire\.codex\skills` as a junction to `D:\Claire\skills` so Codex's default skill discovery still works without storing skill contents on C:.

Codex memories live in `D:\Claire\memory`. Keep `C:\Users\Claire\.codex\memories` as a junction to `D:\Claire\memory` so Codex's default memory discovery still works without storing memory contents on C:.

--- project-doc ---

## Styling

1. 所有样式尽量使用 Tailwind CSS 类名，并直接写在对应文件内。
2. 只有在 Tailwind CSS 无法实现时，才写入 Less 文件。

## Components

1. 能使用 Ant Design 组件时，优先使用 Ant Design 组件。
2. 不要重复手写 Ant Design 已经提供的组件能力。
3. 使用 Ant Design 时，优先使用当前版本推荐的新属性和新方法。
4. Ant Design v6 组件库的使用，要符合其组件规范，避免使用过时的属性和方法。

## Scroll Performance

1. 不要在 `scroll` 回调中调用 `getComputedStyle`、`getBoundingClientRect`、`scrollHeight`、`clientHeight`、`scrollTop`，也不要在滚动过程中驱动 React state。
2. 滚动条的可见状态只能由 `ScrollActivityProvider` 统一管理；页面组件不得重复监听滚动事件。
3. 全屏页面只保留一个明确的纵向滚动容器：父级使用 `overflow: hidden`，子级使用 `min-height: 0`、`overflow-y: auto` 与 `scrollbar-gutter: stable`。
4. 修改滚动行为前，先补充回归测试，至少验证滚动热路径不含布局读取、全屏容器具备明确的纵向滚动规则、页面组件不含滚动 state。

## Workflow

1. 在本工程中进行修改时，不使用 `bug-memory-workflow`、`bug-des`，以及其他缺陷记忆或缺陷文案类 Skill。

</INSTRUCTIONS>
