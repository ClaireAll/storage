# Category Visibility Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist each user's hidden home-category keys in the theme configuration and provide an inline sidebar edit mode to manage them.

**Architecture:** Extend the existing one-row-per-user `theme` configuration with a `hidden_category_keys` text array, and carry it through the existing theme API and browser cache. `home-view.tsx` owns the saved and draft category-visibility state while `home-dashboard.tsx` renders the editable Ant Design menu and reports UI actions upward.

**Tech Stack:** Next.js, React, TypeScript, Ant Design 6, Tailwind CSS v4, Less, Supabase PostgreSQL, Node built-in test runner.

## Global Constraints

- Keep `hidden_category_keys` as `text[] not null default '{}'::text[]`; the migration must use `add column if not exists` because the field may already have been created in Supabase Dashboard.
- Persist stable category keys such as `clothes` and `pants`, never route paths.
- Reuse `POST /api/theme`; do not create a category-preferences endpoint, table, dependency, or global state store.
- Use Tailwind classes in the owning TSX file; use Less only for selectors Tailwind cannot express.
- Use Ant Design 6 `Button` and `Menu` APIs, with accessible icon-only buttons and theme-color icon treatment.
- Preserve unrelated worktree changes. Before each commit, stage only the files named by that task.

---

### Task 1: Persist the category keys in the theme contract

**Files:**
- Create: `supabase/migrations/20260811_add_theme_hidden_category_keys.sql`
- Create: `tests/theme-category-visibility.test.mjs`
- Modify: `src/app/(pages)/theme/types.ts`
- Modify: `src/app/(pages)/theme/constants.ts`
- Modify: `src/app/utils/database.ts`

**Interfaces:**
- Produces `ThemeConfig.hiddenCategoryKeys: string[]` for all theme consumers.
- Produces `ThemeDatabaseRow.hidden_category_keys: string[] | null` for the Supabase read/write mapping.
- Produces a database column containing only the stable keys the home UI will define in Task 2.

- [ ] **Step 1: Write the failing contract test**

Create `tests/theme-category-visibility.test.mjs` with source-level assertions matching the existing Node test style:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const constantsPath = new URL(
  "../src/app/(pages)/theme/constants.ts",
  import.meta.url,
);
const databasePath = new URL("../src/app/utils/database.ts", import.meta.url);
const migrationPath = new URL(
  "../supabase/migrations/20260811_add_theme_hidden_category_keys.sql",
  import.meta.url,
);
const typesPath = new URL(
  "../src/app/(pages)/theme/types.ts",
  import.meta.url,
);

test("persists hidden category keys in the theme contract", async () => {
  const [constants, database, migration, types] = await Promise.all([
    readFile(constantsPath, "utf8"),
    readFile(databasePath, "utf8"),
    readFile(migrationPath, "utf8"),
    readFile(typesPath, "utf8"),
  ]);

  assert.equal(types.includes("hiddenCategoryKeys: string[];"), true);
  assert.equal(types.includes("hidden_category_keys: string[] | null;"), true);
  assert.equal(constants.includes("hiddenCategoryKeys: []"), true);
  assert.equal(constants.includes("hidden_category_keys:"), true);
  assert.equal(database.includes("hidden_category_keys"), true);
  assert.match(
    migration,
    /add column if not exists hidden_category_keys text\[\] not null default '\{\}'::text\[\]/,
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `rtk node --test tests/theme-category-visibility.test.mjs`

Expected: FAIL because the migration and `hiddenCategoryKeys` contract are absent.

- [ ] **Step 3: Add the migration and TypeScript mapping**

Create the migration exactly as follows:

```sql
alter table public.theme
  add column if not exists hidden_category_keys text[] not null default '{}'::text[];
```

Extend the theme types and conversion helpers with the following shapes and fallback behavior:

```ts
export type ThemeConfig = {
  aniTheme?: string | null;
  dark: ThemePalette;
  hiddenCategoryKeys: string[];
  light: ThemePalette;
  mode: ThemeMode;
  texture: ThemeTexture;
};

export type ThemeDatabaseRow = {
  // Existing fields remain unchanged.
  hidden_category_keys: string[] | null;
};
```

In `defaultThemeConfig`, set `hiddenCategoryKeys: []`. In `isThemeConfig`, require an array whose entries are strings. In `getThemeConfigFromRow`, use `row?.hidden_category_keys?.filter((key): key is string => typeof key === "string") ?? []`; in `getThemeRowFromConfig`, assign `hidden_category_keys: config.hiddenCategoryKeys`. Add `hidden_category_keys` to `themeSelectFields` so `getThemeRow` retrieves the column.

- [ ] **Step 4: Run the targeted test to verify it passes**

Run: `rtk node --test tests/theme-category-visibility.test.mjs`

Expected: PASS, proving the migration, default, validation, row mapping, and query field all include hidden category keys.

- [ ] **Step 5: Commit the data contract**

```bash
rtk git add -- supabase/migrations/20260811_add_theme_hidden_category_keys.sql tests/theme-category-visibility.test.mjs src/app/(pages)/theme/types.ts src/app/(pages)/theme/constants.ts src/app/utils/database.ts
rtk git commit -m "feat: persist category visibility preferences"
```

### Task 2: Model stable category keys and own the edit/save state

**Files:**
- Modify: `src/app/(pages)/home/constant.ts`
- Modify: `src/app/(pages)/home/home-view.tsx`
- Modify: `tests/theme-category-visibility.test.mjs`

**Interfaces:**
- Produces `HomeCategory.key: string`, with leaf examples `clothes`, `pants`, `daily-report`, `plugin`, and `skills`.
- Produces `HomeDashboard` props: `hiddenCategoryKeys`, `isCategoryVisibilityEditing`, `onStartCategoryVisibilityEditing`, `onFinishCategoryVisibilityEditing`, `onCancelCategoryVisibilityEditing`, and `onToggleCategoryVisibility`.
- Consumes `ThemeConfig.hiddenCategoryKeys` from Task 1 and `updateTheme(nextConfig)` from the existing `ThemeProvider` render context.

- [ ] **Step 1: Extend the failing test for stable keys and state ownership**

Append this test to `tests/theme-category-visibility.test.mjs`:

```js
const constantPath = new URL(
  "../src/app/(pages)/home/constant.ts",
  import.meta.url,
);
const homeViewPath = new URL(
  "../src/app/(pages)/home/home-view.tsx",
  import.meta.url,
);

test("keeps category visibility as a theme-backed key draft", async () => {
  const [constants, homeView] = await Promise.all([
    readFile(constantPath, "utf8"),
    readFile(homeViewPath, "utf8"),
  ]);

  assert.equal(constants.includes('key: "clothes"'), true);
  assert.equal(constants.includes('key: "daily-report"'), true);
  assert.equal(homeView.includes("draftHiddenCategoryKeys"), true);
  assert.equal(homeView.includes("hiddenCategoryKeys"), true);
  assert.equal(homeView.includes("updateTheme({"), true);
  assert.equal(homeView.includes("onToggleAllCategoriesVisible"), false);
  assert.equal(homeView.includes("onToggleCategoryVisible"), false);
});
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `rtk node --test tests/theme-category-visibility.test.mjs`

Expected: FAIL because categories have no stable leaf keys and the home view still owns route-based visibility toggles.

- [ ] **Step 3: Replace route-based visibility with a theme-backed key draft**

Give every `homeCategories` entry a `key`; use these leaf values in order: `clothes`, `pants`, `toiletries`, `books`, `hobby`, `cosmetic`, `skincare`, `blog`, `daily-report`, `plugin`, `skills`. Give the Codex parent `key: "codex"`, but never add it to `hiddenCategoryKeys`.

In `home-view.tsx`, replace `visibleCategoryHrefs`, `isAllCategoriesVisible`, `toggleCategoryVisible`, and `toggleAllCategoriesVisible` with this state model:

```ts
const [hiddenCategoryKeys, setHiddenCategoryKeys] = useState(
  () => initialTheme.hiddenCategoryKeys,
);
const [draftHiddenCategoryKeys, setDraftHiddenCategoryKeys] = useState<string[]>(
  [],
);
const [isCategoryVisibilityEditing, setIsCategoryVisibilityEditing] =
  useState(false);

const visibleCategoryHrefs = homeLeafCategories
  .filter((category) => !hiddenCategoryKeys.includes(category.key))
  .map((category) => category.href);
```

Implement `startCategoryVisibilityEditing()` by copying `hiddenCategoryKeys` into the draft and setting edit mode. Implement `toggleCategoryVisibility(categoryKey)` by adding/removing exactly that key from the draft. Implement `onCancelCategoryVisibilityEditing()` by resetting the draft to `hiddenCategoryKeys` and setting edit mode false. Implement `finishCategoryVisibilityEditing(themeConfig, updateTheme)` as an immediate exit: set edit mode false, optimistically apply the draft, call `await updateTheme({ ...themeConfig, hiddenCategoryKeys: nextHiddenCategoryKeys })`, and on error restore the previously saved keys and call `message.error(errorMessage)`.

After a successful save, if the active leaf's key is now hidden, navigate to the first leaf whose key is not hidden. When no leaf remains, navigate to `/home` so the existing empty state renders. Do not add a success message. Remove the obsolete visibility props when rendering `HomeDashboard`.

- [ ] **Step 4: Run the targeted test to verify it passes**

Run: `rtk node --test tests/theme-category-visibility.test.mjs`

Expected: PASS, proving the home view uses stable keys, theme persistence, a draft, and no legacy route-based toggles.

- [ ] **Step 5: Commit the state transition**

```bash
rtk git add -- src/app/(pages)/home/constant.ts src/app/(pages)/home/home-view.tsx tests/theme-category-visibility.test.mjs
rtk git commit -m "feat: manage category visibility settings"
```

### Task 3: Render and protect the sidebar editing controls

**Files:**
- Modify: `src/app/(pages)/home/home-dashboard.tsx`
- Modify: `tests/home-dashboard-sidebar.test.mjs`

**Interfaces:**
- Consumes the Task 2 edit-state props and the stable `HomeCategory.key` values.
- Produces an expanded-sidebar `icon-setting` control and leaf-row `icon-visible` / `icon-invisible` controls.
- Keeps existing collapsed spacing classes and `HomeContentFullscreenProvider` behavior intact.

- [ ] **Step 1: Write the failing sidebar interaction test**

Append this test to `tests/home-dashboard-sidebar.test.mjs`:

```js
test("edits category visibility from the expanded sidebar only", async () => {
  const source = await readDashboardSource();

  assert.equal(source.includes('name="icon-setting"'), true);
  assert.equal(source.includes("isCategoryVisibilityEditing"), true);
  assert.equal(source.includes('name="icon-visible"'), true);
  assert.equal(source.includes('name="icon-invisible"'), true);
  assert.equal(source.includes("onToggleCategoryVisibility"), true);
  assert.equal(source.includes("event.stopPropagation()"), true);
  assert.equal(source.includes("if (isCategoryVisibilityEditing)"), true);
  assert.equal(source.includes("hiddenCategoryKeys.includes(child.key)"), true);
});
```

- [ ] **Step 2: Run the sidebar test to verify it fails**

Run: `rtk node --test tests/home-dashboard-sidebar.test.mjs`

Expected: FAIL because the current sidebar has only the collapse button and filters by route visibility.

- [ ] **Step 3: Implement the expanded-sidebar setting and leaf actions**

Expand `HomeDashboardProps` with the Task 2 callbacks and state. Build `menuItems` from all categories when `isCategoryVisibilityEditing` is true; otherwise filter every leaf by `hiddenCategoryKeys.includes(category.key)`. Keep a parent only when it has a remaining child. Use each leaf `key` for visibility decisions and each `href` for Ant Design `Menu` navigation keys.

Replace the expanded title area with a title/action group and retain the existing collapse button on the far right:

```tsx
<div className="flex min-w-0 items-center gap-1">
  <Typography.Title className="mb-0!" level={5}>
    分类
  </Typography.Title>
  <Button
    aria-label={isCategoryVisibilityEditing ? "保存分类设置" : "编辑分类设置"}
    className="text-(--home-theme-color)!"
    icon={<CategoryIcon hasPadding={false} name="icon-setting" />}
    onClick={
      isCategoryVisibilityEditing
        ? onFinishCategoryVisibilityEditing
        : onStartCategoryVisibilityEditing
    }
    size="small"
    type="text"
  />
</div>
```

For each leaf label in edit mode, render an icon-only Ant Design `Button` on the right. Its `aria-label` must describe the next action, its icon must be `icon-visible` for a currently visible key and `icon-invisible` for a hidden key, and its click handler must call both `event.preventDefault()` and `event.stopPropagation()` before calling `onToggleCategoryVisibility(child.key)`. Apply `opacity-45` to hidden draft rows. In `Menu.onClick`, return immediately while editing so labels cannot navigate. Do not render the settings group while the sidebar is collapsed.

When the sidebar collapse button is pressed during editing, discard the uncommitted draft by calling a new `onCancelCategoryVisibilityEditing` callback before collapsing; ordinary mode must remain navigable after collapse. Preserve the current `home-category-menu-scroll` conditional padding exactly.

- [ ] **Step 4: Run the sidebar test to verify it passes**

Run: `rtk node --test tests/home-dashboard-sidebar.test.mjs`

Expected: PASS, including all existing submenu, scroll, collapsed-spacing, and fullscreen assertions.

- [ ] **Step 5: Commit the sidebar UI**

```bash
rtk git add -- src/app/(pages)/home/home-dashboard.tsx tests/home-dashboard-sidebar.test.mjs
rtk git commit -m "feat: edit category visibility in sidebar"
```

### Task 4: Verify the complete feature and record delivery

**Files:**
- Modify: `update.md`

**Interfaces:**
- Consumes the completed theme contract, state transition, and sidebar UI from Tasks 1-3.
- Produces documented verification evidence without changing feature behavior.

- [ ] **Step 1: Update the project changelog without disturbing concurrent edits**

Open the current `update.md` immediately before editing. Add one entry matching its current chronology and formatting that states: `首页分类侧栏支持按账号保存叶子分类可见性，使用主题设置保存并可在侧栏设置模式中恢复隐藏分类。` Preserve every existing user edit and do not reorder unrelated entries.

- [ ] **Step 2: Run focused automated tests**

Run: `rtk node --test tests/theme-category-visibility.test.mjs tests/home-dashboard-sidebar.test.mjs`

Expected: PASS with the new theme contract and sidebar interaction assertions, plus all pre-existing sidebar regressions.

- [ ] **Step 3: Run full project verification**

Run each command separately:

```bash
rtk pnpm typecheck
rtk pnpm lint
rtk pnpm build
```

Expected: all commands exit with code 0. Do not run `typecheck` and `build` concurrently because both write Next.js generated files.

- [ ] **Step 4: Perform browser acceptance checks**

Run the local development server on a free port and verify both desktop and narrow viewports:

```text
1. Expand the sidebar; the theme-color settings icon appears immediately after “分类”.
2. Enter edit mode; all leaf categories appear, and hidden rows are dimmed with the invisible icon.
3. Click an eye icon; the row changes state without route navigation.
4. Exit edit mode; saved hidden rows disappear, and a fully hidden Codex group disappears.
5. Hide the active category; confirm navigation to the first remaining leaf, then hide all leaves and confirm the empty state.
6. Force a failed /api/theme response; confirm edit mode exits, the prior list returns, and only an error message appears.
7. Collapse and expand the sidebar; confirm the setting control is absent while collapsed and prior symmetric spacing remains intact.
```

- [ ] **Step 5: Commit verification and delivery notes**

```bash
rtk git add -- update.md
rtk git commit -m "docs: record category visibility settings"
rtk git status --short
```

Expected: the feature commits are complete; any remaining status entries must be unrelated user work and must not be staged, reverted, or committed.
