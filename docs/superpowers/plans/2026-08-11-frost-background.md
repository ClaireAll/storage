# Frost Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Canvas UI Frost as a selectable, interactive background texture without allowing it to capture or block application cards.

**Architecture:** Install Canvas UI's published Frost source through the shadcn registry, then wrap it with a storage-specific background adapter. The adapter mounts only for `texture === "frost"`, feeds Frost an empty source surface, forwards pointer activity from non-interactive background regions, and uses reduced quality so cards, charts, and scrolling remain outside its rendering work.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Canvas UI Frost source, Node test runner.

## Global Constraints

- Keep Frost behind application content and preserve all existing card and control interactions.
- Do not use Canvas UI's live HTML capture for the app shell or cards.
- Cap Frost quality at `0.4`, set `shimmer` to `0`, and destroy the renderer when Frost is not selected.
- Do not add scroll handlers or scroll-driven React state.
- Prefer Tailwind classes; only place global canvas stacking selectors in existing texture styles when Tailwind cannot express cross-tree state.

---

### Task 1: Add Frost To The Theme Contract

**Files:**
- Modify: `src/app/(pages)/theme/types.ts`
- Modify: `src/app/(pages)/theme/constants.ts`
- Test: `tests/theme-frost-texture.test.mjs`

**Interfaces:**
- Produces: `ThemeTexture` accepts `"frost"`.
- Produces: `THEME_TEXTURES` exposes `{ label: "霜冻", value: "frost" }`.

- [x] **Step 1: Write the failing contract test**

```js
assert.equal(types.includes('"frost"'), true);
assert.equal(constants.includes('{ label: "霜冻", value: "frost" }'), true);
assert.equal(constants.includes('value === "frost"'), true);
```

- [x] **Step 2: Run the test to verify it fails**

Run: `node --test tests/theme-frost-texture.test.mjs`

Expected: FAIL because the texture union and theme option do not include `frost`.

- [x] **Step 3: Extend the theme type, option list, and validator**

```ts
export type ThemeTexture = "none" | "bokeh" | "geometry" | "meteor" | "frost";

{ label: "霜冻", value: "frost" },

value === "frost"
```

- [x] **Step 4: Re-run the focused test**

Run: `node --test tests/theme-frost-texture.test.mjs`

Expected: PASS.

### Task 2: Import And Isolate The Canvas UI Renderer

**Files:**
- Create: `src/components/canvasui/Frost.tsx`
- Create: `src/app/(pages)/theme/theme-frost-texture.tsx`
- Test: `tests/theme-frost-texture.test.mjs`

**Interfaces:**
- Consumes: Canvas UI Frost's `createFrost` renderer and `ThemeTexture`.
- Produces: `ThemeFrostTexture({ texture, variant })`, where `variant` is `"shared" | "preview"`.

- [x] **Step 1: Install the published Canvas UI source and verify its output**

Run: `npx shadcn@latest add @canvas-ui/frost-react --yes`

Expected: the registry writes a local `Frost` source component compatible with this repository's `components.json` aliases.

- [x] **Step 2: Write the failing source-shape test**

```js
assert.equal(frostTexture.includes('texture !== "frost"'), true);
assert.equal(frostTexture.includes('quality: 0.4'), true);
assert.equal(frostTexture.includes('shimmer: 0'), true);
assert.equal(frostTexture.includes('pointer-events-none'), true);
assert.equal(frostTexture.includes('addEventListener("scroll"'), false);
```

- [x] **Step 3: Build the background adapter**

```tsx
export function ThemeFrostTexture({ texture, variant }: ThemeFrostTextureProps) {
  if (texture !== "frost") return null;

  const frost = createFrost({ content, output, source }, {
    observeScroll: false,
    pixelRatio: 1,
    quality: 0.4,
    shimmer: 0,
  });
}
```

The adapter must register one passive, frame-coalesced pointer listener only while selected. It ignores known controls and card surfaces, dispatches melt coordinates to Frost's background surface, and tears down the listener on unmount. It must not use scroll listeners.

- [x] **Step 4: Run the focused test**

Run: `node --test tests/theme-frost-texture.test.mjs`

Expected: PASS.

### Task 3: Render Frost In The Shared Layer And Theme Preview

**Files:**
- Modify: `src/app/(pages)/theme/shared-theme-texture.tsx`
- Modify: `src/app/(pages)/theme/theme-settings-page.tsx`
- Modify: `src/app/(pages)/theme/styles/theme-settings.less`
- Test: `tests/theme-frost-texture.test.mjs`

**Interfaces:**
- Consumes: `ThemeFrostTexture` from Task 2.
- Produces: the same Frost selection in the application background and the theme preview.

- [x] **Step 1: Extend the integration assertions**

```js
assert.equal(sharedTexture.includes('<ThemeFrostTexture'), true);
assert.equal(settingsPage.includes('variant="preview"'), true);
assert.equal(baseTexture.includes('.theme-frost-texture'), true);
```

- [x] **Step 2: Mount the adapter in both locations**

```tsx
<ThemeFrostTexture texture={textureDetail.texture} variant="shared" />

<ThemeFrostTexture texture={draftTheme.texture} variant="preview" />
```

Keep the shared canvas in the theme layer at `z-index: 1` and retain `pointer-events: none`; the adapter handles background pointer forwarding without changing the stacking order of app content.

- [x] **Step 3: Add Frost-specific stacking and fallback styles**

Use the existing theme-settings selector only to exclude `.theme-frost-texture` from foreground stacking. The static fallback stays in the adapter as Tailwind utility classes, so it remains visible with reduced motion or unsupported WebGL.

- [x] **Step 4: Run the focused test**

Run: `node --test tests/theme-frost-texture.test.mjs`

Expected: PASS.

### Task 4: Verify Performance, Theme Behavior, And Delivery Artifacts

**Files:**
- Modify: `update.md`
- Test: `tests/theme-frost-texture.test.mjs`

**Interfaces:**
- Verifies: Frost only exists for the selected texture and does not add a scroll hot path.

- [x] **Step 1: Run focused regression coverage**

Run: `node --test tests/theme-frost-texture.test.mjs tests/scroll-activity-performance.test.mjs`

Expected: PASS.

- [x] **Step 2: Run project verification**

Run: `npm run typecheck`, `npm run lint`, `npm run build`

Expected: all commands exit with status `0`.

- [ ] **Step 3: Inspect the rendered result**

Use the local dev server to verify Frost selection in light and dark mode, the preview, card clicks, dialog controls, background melting, deselection cleanup, and reduced-motion fallback.

- [x] **Step 4: Record the release entry and commit**

Add a timestamped Frost background entry to `update.md`, then commit the Frost source, adapter, theme integration, tests, and update record with `feat: add frost background texture`.
