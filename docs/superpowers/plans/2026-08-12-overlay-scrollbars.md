# Overlay Scrollbars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every custom scrolling surface with a shared Fine Design-style overlay scrollbar that does not reserve layout space.

**Architecture:** `OverlayScrollArea` owns a relative host, a native scrolling child, and overlay rails. A shared metrics effect observes size and content changes, while CSS scroll timelines move thumbs without scroll-event layout reads or React state. `ScrollActivityProvider` remains the sole owner of vertical scrollbar visibility.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, Ant Design 6, CSS Scroll-driven Animations, Node test runner.

## Global Constraints

- Preserve existing image-upload flows and Ant Design data behaviors.
- The native scrollbar is hidden and must not reserve layout space.
- Do not read layout or update React state in a `scroll` callback.
- Vertical visibility remains controlled only by `ScrollActivityProvider`; hide delay remains two seconds.
- Horizontal rails remain visible when horizontal overflow exists.
- No new dependency.

---

### Task 1: Shared Overlay Scroll Area

**Files:**
- Create: `src/app/(pages)/common/overlay-scrollbar.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/overlay-scrollbar.test.mjs`

**Produces:** `OverlayScrollArea` for direct scroll containers and `OverlayScrollbar` for Ant Design-owned targets.

- [ ] Write the regression test for overlay placement, drag support, resize/content metrics, and no scroll listener.
- [ ] Verify the test fails because the public component and styles are absent.
- [ ] Implement the component with `ResizeObserver` and `MutationObserver`; calculate metrics only from those callbacks and pointer interaction start.
- [ ] Add absolute vertical and horizontal rails, CSS scroll timelines, focus handling, and reduced-motion-safe transitions.
- [ ] Verify the shared test passes.

### Task 2: Adopt the Shared Area

**Files:**
- Modify: `src/app/(pages)/home/codex-log/codex-log-dashboard.tsx`
- Modify: `src/app/(pages)/home/home-dashboard.tsx`
- Modify: `src/app/(pages)/common/ai-assistant.tsx`
- Modify: `src/app/(pages)/home/blog/blog-reader.tsx`
- Modify: `src/app/(pages)/home/clothes/clothes-gallery.tsx`
- Modify: `src/app/(pages)/home/clothes/clothes-create-modal.tsx`
- Modify: `src/app/(pages)/home/github-readme-preview-content.tsx`
- Modify: relevant share and theme page scroll surfaces
- Remove: `src/app/(pages)/theme/styles/codex-log-fullscreen-scroll.less` when superseded
- Test: existing scroll, fullscreen, and layout tests

**Consumes:** `OverlayScrollArea` and `OverlayScrollbar`.

- [ ] Replace the Codex-specific scrollbar calculations and pointer handlers with the common component.
- [ ] Migrate each custom vertical and horizontal area without changing its data flow, upload flow, or keyboard semantics.
- [ ] Attach the table overlay only to Ant Design's actual internal scroll target after it mounts.
- [ ] Keep fullscreen with one explicit vertical dashboard container and no outer scroll competition.
- [ ] Update existing tests to use the public common behavior rather than Codex-specific internals.

### Task 3: Verify and Document

**Files:**
- Modify: `update.md`
- Test: `tests/overlay-scrollbar.test.mjs`, existing scrollbar/layout tests

- [ ] Run the targeted Node regression suite.
- [ ] Run `npm run typecheck`, `npm run lint`, and `npm run build`.
- [ ] Inspect the final diff for accidental changes to image upload or unrelated user work.
- [ ] Add a dated `update.md` entry describing the unified overlay scrollbar.
