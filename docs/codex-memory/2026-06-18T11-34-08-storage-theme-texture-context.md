Project: D:\Claire\storage

Context to preserve for future Codex chats:

- This is a Next.js/React/Tailwind/Ant Design/Supabase project with theme settings and animated theme background textures.
- Do not revert unrelated uncommitted changes. The workspace had many existing edits during this work.
- Theme pages live under `src/app/(pages)`, APIs under `src/app/api`. Home is `/home`; `/` redirects to `/home`.
- Hydration safety matters in this project. Browser-derived theme/system/localStorage/matchMedia/random state should not affect SSR-visible first render. Keep randomness in `useEffect` or event handlers.

Current theme texture options:

- `none`: 无纹路
- `bokeh`: 散景动画
- `geometry`: 几何动画
- `meteor`: 流星动画

Important files:

- `src/app/(pages)/theme/types.ts`
- `src/app/(pages)/theme/constants.ts`
- `src/app/(pages)/theme/theme.css`
- `src/app/(pages)/theme/shared-theme-texture.tsx`
- `src/app/(pages)/theme/theme-settings-page.tsx`
- `src/app/(pages)/theme/theme-geometry-texture.tsx`
- `src/app/(pages)/home/home-view.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`

Shared background architecture:

- `SharedThemeTexture` is mounted globally in `src/app/layout.tsx` so the animated background persists across route changes.
- Pages publish active texture data with `ThemeTexturePublisher`.
- Theme preview uses local preview variables. For preview correctness, `theme-live-preview-body` must set `--app-texture-color` and `--app-texture-text` from `previewPalette`; otherwise preview meteor color may keep using the previously applied outer theme color.

Meteor animation current behavior:

- Animation option is named `流星动画`, value `meteor`.
- Old database value `falling-lines` is normalized to `meteor` in `constants.ts`.
- `ThemeFallingLights` in `shared-theme-texture.tsx` renders meteor items only when texture is `meteor`.
- Meteor count is currently 22.
- Meteor duration is currently randomized from `6.4s` to `13.2s`, intentionally slower than the previous range.
- Meteor position is biased toward left and right sides: most items spawn in `2%-26%` or `74%-98%`, with a smaller chance in the middle.
- Meteor animation is one-shot, not CSS `infinite`: each item starts above the top, falls down, ends below the bottom, then React remounts a new item with a fresh `runId`.
- This one-shot/remount design avoids flickering, mid-screen sudden appearances, and CSS loop boundary jumps.
- `onAnimationEnd` handles replacement; `onAnimationIteration` should not be used for meteor replacement.
- The CSS animation is on `.theme-meteor-line` only. `::before` and `::after` only draw the tail and head and must not have their own animations.
- The meteor shape is vertical from top to bottom, not diagonal. The user rejected diagonal and orb/glow-ball versions.
- Current shape: thin theme-color tail plus a small, slightly thicker theme-color head. Avoid large head, glowing sphere, or sudden thick-to-thin discontinuity.

Recent user preferences about meteor animation:

- Keep falling from top to bottom.
- Avoid any object appearing from the middle of the page.
- Avoid flickering or sudden appearance/disappearance.
- Keep appearance continuous and randomly staggered.
- Meteor can be moderately slower.
- In theme preview, meteor color must update immediately when editing the theme.
- User disliked versions that looked like big glowing balls, pills, or large heads attached to very thin lines.

Verification status:

- After the latest meteor speed change, both commands passed:
  - `pnpm typecheck`
  - `pnpm lint`

