# Frost Background Design

## Goal

Add `frost` as a theme background texture. It preserves Canvas UI Frost's hover-to-melt interaction while remaining behind all application content.

## Scope

- Add a `frost` option to the persisted `ThemeTexture` setting and the theme settings selector.
- Render one fixed WebGL canvas below headers, panels, dialogs, cards, and the page content.
- The canvas receives pointer events only on exposed page background. Cards and controls remain above it and keep their existing interactions.
- Melting exposes the resolved theme background, not captured page or card content.
- Do not change the existing `none`, `bokeh`, `geometry`, or `meteor` textures.

## Architecture

`ThemeFrostTexture` is a client-only background component owned by the existing shared theme texture layer. It creates a Canvas UI-derived Frost renderer only while `texture === "frost"` and tears down the renderer when the setting, route, or component unmounts.

The renderer is configured as a background-only variant: no DOM capture, no card rendering, no refraction of application UI, and no continuous shimmer. Its canvas is stacked above the shell background but below the app shell content. The existing theme preview mounts the same component at reduced preview dimensions.

## Performance Budget

- Render at a capped device-pixel ratio and `quality` in the `0.35-0.5` range.
- Render only when Frost is selected; destroy WebGL resources immediately when it is deselected.
- Use a single `requestAnimationFrame` loop inside the Frost renderer. Do not attach scroll listeners or React state updates to pointer movement.
- Respect `prefers-reduced-motion` by rendering a static frost layer and disabling the melt animation.
- Do not capture live HTML into a canvas. Canvas UI's full-page `html-in-canvas` path is intentionally out of scope because it competes with charts, tables, scrolling, and existing page animations.

## Interaction And Fallbacks

- Pointer movement over exposed background melts a temporary irregular opening; it refreezes after the pointer leaves.
- Cards, dialogs, menus, and form controls continue to receive their normal pointer events.
- If WebGL2 is unsupported or initialization fails, show a static CSS frost texture so the selected theme remains usable.
- The hobby share route remains excluded from application theme textures, matching the existing shared texture behavior.

## Verification

- Extend theme texture tests to include validation and normalization of `frost`.
- Add a focused component test that checks Frost mounts only when selected and has no page-level scroll handler.
- Run `npm run typecheck`, `npm run lint`, and `npm run build`.
- Manually check light mode, dark mode, the theme preview, card interaction, and route switching with browser DevTools performance recording.
