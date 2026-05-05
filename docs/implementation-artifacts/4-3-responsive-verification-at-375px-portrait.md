---
story_id: 4.3
epic: 4
title: Responsive verification at 375px portrait
status: ready-for-dev
priority: MVP
estimated_effort: S
fr_nfr_coverage: [FR11, NFR1]
inputDocuments:
  - docs/planning-artifacts/epics.md
  - docs/planning-artifacts/architecture.md
  - docs/planning-artifacts/prd.md
  - docs/project-context.md
---

# Story 4.3 — Responsive verification at 375px portrait

**Status:** `ready-for-dev`
**Epic:** 4 — E2E, accessibility, and responsive polish
**Priority:** MVP
**Effort:** S

---

## User story

**As** a mobile user,
**I want** a Playwright spec that asserts the app is usable at 375px portrait,
**So that** NFR1 has a real, repeatable verification rather than a one-time manual check.

---

## Acceptance criteria

Copied verbatim from `docs/planning-artifacts/epics.md` Story 4.3, with stable IDs added.

- **AC-1** — **Given** a Playwright spec configured with a 375×667 viewport, **when** the spec navigates to `/`, **then** it asserts no horizontal scrollbar (`document.documentElement.scrollWidth <= viewport width`). **And** it asserts the canvas, controls, and gen counter are all visible (or reachable by vertical scroll).

- **AC-2** — **Given** the same spec, **when** the user taps a cell on the canvas, **then** the cell toggles alive (verifies touch handler parity with mouse).

- **AC-3** *(SM-added)* — **Given** the responsive layout, **when** the page renders at 375×667, **then** the form, canvas, and controls are stacked vertically (form `top` < canvas `top` < controls `top` by bounding-box check). This is the explicit assertion of "stacked layout" from the user-task brief and from architecture's responsive guidance.

---

## Locked technical decisions

These are decisions Dev does **not** need to relitigate.

### Viewport meta tag — required, currently missing

Audit of `apps/web/src/app/layout.tsx` shows it does **not** declare a viewport tag. Without it, mobile browsers render at desktop width (typically 980px) scaled down — `document.documentElement.scrollWidth` will exceed 375 and AC-1 will fail spuriously.

**Locked: add the Next.js App Router `viewport` export to `layout.tsx`.** The App Router supports a top-level `viewport` export (preferred over a manual `<meta>` tag because Next emits the correct tag and dedupes). Add:

```tsx
// apps/web/src/app/layout.tsx
import type { Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};
```

`metadata` and `viewport` coexist as sibling exports in App Router. **Do not** add a manual `<meta name="viewport">` to the `<head>` — the App Router would emit a duplicate.

> **SM resolution.** The user-task brief noted "this may need a `<meta name="viewport">` tag if not already present." The App Router idiom is the typed `viewport` export. Both produce the same emitted HTML; the export is the canonical Next.js 13+/14+/16 form and is what new contributors will expect to find.

### Spec file location and naming (locked)

```
apps/web-e2e/src/
  e2e/
    happy-path.spec.ts         # Story 4.1 — untouched
    keyboard.spec.ts           # Story 4.2 — untouched
    responsive.spec.ts         # NEW — this story
```

A separate file (not a third test in `happy-path.spec.ts`) keeps the happy path tight and lets the responsive spec lock the viewport via `test.use({ viewport: ... })` without affecting other tests.

### Viewport configuration — `test.use` per file (locked)

```ts
test.use({ viewport: { width: 375, height: 667 } });
```

This applies to every `test()` in the file. **Do not** put it inside individual tests; the file-level `use` is cleaner and matches Playwright idiom. Do **not** modify `playwright.config.ts` to globally change the viewport — other specs (4.1, 4.2) need the default desktop viewport.

### Layout stacking assertion strategy — bounding boxes (AC-3, locked)

To prove "form above canvas above controls":

```ts
const form = page.getByRole('group', { name: /grid size/i }).or(page.locator('form'));
const canvas = page.locator('canvas');
const controls = page.getByRole('group', { name: /controls/i }).or(page.getByRole('button', { name: /^play$|^pause$/i }).locator('xpath=ancestor::*[1]'));
```

Then assert by bounding box `top`:

```ts
const formBox = await form.boundingBox();
const canvasBox = await canvas.boundingBox();
const controlsBox = await controls.boundingBox();
// All three non-null
expect(formBox!.y + formBox!.height).toBeLessThanOrEqual(canvasBox!.y + 1);
expect(canvasBox!.y + canvasBox!.height).toBeLessThanOrEqual(controlsBox!.y + 1);
```

The `+ 1` slack tolerates sub-pixel layout.

> **Note on the locator strategy:** the user-task brief described the layout as "stacked < 640px / side-by-side ≥ 640px" (Story 3.1). The exact DOM grouping may not have a `role="group"`. If `getByRole('group', ...)` fails, fall back to `page.locator('form')` for the form and `page.getByTestId('controls')` (Dev: add this `data-testid` to the controls wrapper if needed — it's the same pattern Story 3.3 used for `gen-count`). **Decision:** Dev confirms current DOM during implementation; if a stable wrapper is missing, add a single `data-testid="controls"` to `Controls.tsx`'s root `<div>`. **Do not** invent a role; `data-testid` is allowed for layout grouping when no semantic role is appropriate.

### No-horizontal-scroll assertion (AC-1, locked)

```ts
const horizontalOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth
);
expect(horizontalOverflow).toBe(false);
```

Or equivalently: `expect(scrollWidth).toBeLessThanOrEqual(clientWidth)`. The architecture's NFR1 wording is "no horizontal scrollbar at 375px" — `scrollWidth <= clientWidth` is the canonical check.

### Tap-to-toggle parity (AC-2, locked)

Playwright's `page.tap(...)` synthesizes a touch event. The canvas listens to `pointerdown` (per Story 3.2), which fires for both mouse and touch. To verify the toggle worked, **use the counter approach** from Story 4.1: tap a cell, click Play, assert `gen-count` advances past 0 within a polling window.

> **SM resolution.** Same canvas-state-verification problem as Story 4.1. Same answer: counter-based (option C). Do **not** introduce pixel sampling or debug globals here either.

The spec's tap test:
1. Set canvas size to 10×10 (smaller grid → cells are larger → the tap target is comfortably above the 44×44 mobile-touch-target threshold even at 375px wide).
2. Compute cell-center pixel coords from `canvas.boundingBox()`.
3. Tap three cells in a row (horizontal blinker).
4. Click Play.
5. Assert counter goes >= 1.

### Touch emulation — Playwright defaults handle it

`test.use({ viewport: ..., hasTouch: true })` enables touch event synthesis. **Locked:** add `hasTouch: true` to the file-level `use`. Without it, `page.tap()` falls back to a mouse click and AC-2 wouldn't actually test the touch path. (The cell still toggles either way, but AC-2 specifically calls out "touch handler parity with mouse" — make the test honest.)

```ts
test.use({
  viewport: { width: 375, height: 667 },
  hasTouch: true,
});
```

### Optional: also flip `isMobile: true`

`isMobile: true` in `test.use` enables additional mobile emulation (default user-agent, meta viewport handling, etc.). **Locked: do NOT set `isMobile: true`.** Reason: `isMobile` is only supported on chromium in Playwright; setting it constrains the spec to chromium-only. Since CI already runs only chromium (Story 1.5), this is fine in practice — but the spec should be portable for local devs running webkit/firefox. Plain viewport + hasTouch is enough for AC-1 / AC-2 / AC-3.

### File layout

```
apps/web/src/
  app/
    layout.tsx                            # MODIFIED — add viewport export
    layout.spec.tsx                       # OPTIONAL — see below
apps/web-e2e/src/
  e2e/
    responsive.spec.ts                    # NEW — this story
apps/web/src/components/
  Controls.tsx                            # MAY BE MODIFIED — add data-testid="controls" to wrapper IF current DOM has no stable selector
```

**`layout.spec.tsx` is optional.** Testing a layout file is brittle (Next.js renders it server-side; it's largely metadata). Skip it. The viewport meta is verified incidentally by Playwright (the absence of horizontal scroll at 375px is the proof).

---

## Test plan

This story is primarily a Playwright spec. Jest changes are minimal.

### `apps/web-e2e/src/e2e/responsive.spec.ts` — NEW

`test.describe('responsive — 375px portrait', ...)` with three tests:

**Test 1 — `'AC-1: no horizontal scrollbar at 375×667'`**
1. Navigate to `/`.
2. Wait for canvas to be visible (`await expect(page.locator('canvas')).toBeVisible()`).
3. Read `scrollWidth` and `clientWidth` of `documentElement`.
4. Assert `scrollWidth <= clientWidth`.
5. Also assert `await page.evaluate(() => document.body.scrollWidth) <= 375` for redundancy.

**Test 2 — `'AC-3: layout is stacked (form above canvas above controls)'`**
1. Navigate.
2. Locate form, canvas, controls (per locator strategy above).
3. Read all three bounding boxes; assert each is non-null.
4. Assert `formBox.y + formBox.height <= canvasBox.y + 1`.
5. Assert `canvasBox.y + canvasBox.height <= controlsBox.y + 1`.

**Test 3 — `'AC-2: tap on canvas toggles a cell'`**
1. Navigate.
2. Set canvas size to 10×10 via the form (uses Width/Height/Apply locators from 4.1).
3. Confirm `gen-count` text is `0`.
4. Compute cell-center coords for `(4,5), (5,5), (6,5)`.
5. `await page.touchscreen.tap(x, y)` for each cell. (`page.touchscreen.tap` synthesizes a real touch event when `hasTouch: true`.)
6. Click Play.
7. `expect.poll` `gen-count >= 1` within 5000ms.

> **Note on `page.tap()` vs `page.touchscreen.tap()`:** the latter is unambiguously a touch event. The former is a higher-level helper that may fall back depending on the locator. **Locked: use `page.touchscreen.tap(x, y)` with the absolute pixel coords from `boundingBox()`.**

### Jest changes — none required

Story 3.1 already has component tests for the responsive shell at the CSS-Module / breakpoint level. Story 3.2 has unit tests for the `pointerdown` toggle handler. There is no new Jest layer to add here; Playwright is the right verification level for the cross-cutting "no horizontal scroll + correct stacking + touch parity" assertion.

If Dev needs to add a `data-testid="controls"` to the controls wrapper to make Test 2 work, **add a tiny render-test in `Controls.spec.tsx`** that asserts the wrapper has the testid. One-line assertion.

---

## Dev notes

### Hard rules (Epic 4-wide)

- **Viewport meta is added via the typed `viewport` export in `layout.tsx`** — not a manual `<meta>` tag.
- **Do not modify `playwright.config.ts`.** File-level `test.use` is the right scope.
- **Do not** set `isMobile: true` (chromium-only; would break local webkit/firefox runs).
- **Do not** modify `libs/sim/`.
- **Do not** modify `_bmad/`, `.claude/`, `.cursor/`, `.opencode/`, `AGENTS.md`, `CLAUDE.md`.
- **`page.touchscreen.tap` over `page.tap`** for honest touch event synthesis (with `hasTouch: true`).
- **`expect.poll` for counter assertions** (project-context rule #19).

### Cross-story coordination

- **Builds on Story 3.1** — responsive shell breakpoints (stacked < 640px) shipped there.
- **Builds on Story 3.2** — `pointerdown` handler shipped there; AC-2 verifies it fires on real touch events.
- **Builds on Story 4.1** — locator vocabulary (Width, Height, Apply, Play, gen-count testid).
- **Independent of Story 4.2** — keyboard reachability and responsive verification are orthogonal concerns; they can land in any order.

### Locked layout.tsx — full file

```tsx
// apps/web/src/app/layout.tsx
import type { Viewport } from 'next';
import './global.css';

export const metadata = {
  title: "Conway's Game of Life",
  description:
    "Interactive Conway's Game of Life simulation — paint, run, pause, step, and adjust speed.",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

The `Viewport` type comes from `next` (Next.js 13.2+; the repo runs Next 16, so it is available).

### Locked spec — `apps/web-e2e/src/e2e/responsive.spec.ts` shape

```ts
import { expect, test } from '@playwright/test';

test.use({
  viewport: { width: 375, height: 667 },
  hasTouch: true,
});

test.describe('responsive — 375px portrait', () => {
  test('AC-1: no horizontal scrollbar at 375x667', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible();

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
    expect(overflow.scrollWidth).toBeLessThanOrEqual(375);
  });

  test('AC-3: layout is stacked (form, canvas, controls top-to-bottom)', async ({ page }) => {
    await page.goto('/');

    const form = page.locator('form').first();
    const canvas = page.locator('canvas');
    const controls = page.getByTestId('controls'); // see note re: testid fallback

    const [formBox, canvasBox, controlsBox] = await Promise.all([
      form.boundingBox(),
      canvas.boundingBox(),
      controls.boundingBox(),
    ]);
    expect(formBox).not.toBeNull();
    expect(canvasBox).not.toBeNull();
    expect(controlsBox).not.toBeNull();
    expect(formBox!.y + formBox!.height).toBeLessThanOrEqual(canvasBox!.y + 1);
    expect(canvasBox!.y + canvasBox!.height).toBeLessThanOrEqual(controlsBox!.y + 1);
  });

  test('AC-2: tap on canvas toggles a cell (touch parity with mouse)', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/width/i).fill('10');
    await page.getByLabel(/height/i).fill('10');
    await page.getByRole('button', { name: /apply/i }).click();
    await expect(page.getByTestId('gen-count')).toHaveText(/^0$/);

    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas not visible');
    const cellW = box.width / 10;
    const cellH = box.height / 10;

    for (const [c, r] of [[4, 5], [5, 5], [6, 5]] as const) {
      const x = box.x + (c + 0.5) * cellW;
      const y = box.y + (r + 0.5) * cellH;
      await page.touchscreen.tap(x, y);
    }

    await page.getByRole('button', { name: /^play$/i }).click();
    await expect
      .poll(async () => Number(await page.getByTestId('gen-count').innerText()), {
        timeout: 5000,
        intervals: [100, 200, 500],
      })
      .toBeGreaterThanOrEqual(1);
  });
});
```

### data-testid="controls" — add only if needed

Before adding it, Dev should confirm the current DOM. Quick check:
```bash
grep -n 'className' apps/web/src/components/Controls.tsx | head
```
If the root wrapper has a stable class but no role and no testid, the simplest fix is a `data-testid="controls"` on the root `<div>` in `Controls.tsx`. **Do not** wrap the existing `<div>` in another wrapper for the testid — modify the existing one. Add a one-line assertion in `Controls.spec.tsx`: `expect(container.firstChild).toHaveAttribute('data-testid', 'controls')`.

### What NOT to do here

- **Do not** add a manual `<meta name="viewport">` tag in `layout.tsx`. Use the typed `viewport` export.
- **Do not** modify `playwright.config.ts`. File-level `test.use` is correct.
- **Do not** set `isMobile: true`. Chromium-only constraint we don't need.
- **Do not** add Tailwind-style breakpoint utilities — the project uses CSS Modules; existing Story 3.1 breakpoints stand.
- **Do not** assert exact pixel positions — bounding-box `y` comparisons (with the `+ 1` slack) are the right level of constraint.
- **Do not** add screenshot diffs — brittle.
- **Do not** read canvas pixel data to verify the tap. Counter-based, same as Story 4.1.
- **Do not** assert specific font sizes or line heights — out of NFR1 scope.

---

## Definition of done

- [ ] `apps/web/src/app/layout.tsx` exports a typed `viewport: Viewport` constant with `width: 'device-width'` and `initialScale: 1`.
- [ ] `apps/web-e2e/src/e2e/responsive.spec.ts` exists with the three tests in the test plan: AC-1 (no horizontal scroll), AC-3 (stacked layout), AC-2 (tap toggles cell, verified via counter).
- [ ] Spec uses `test.use({ viewport: { width: 375, height: 667 }, hasTouch: true })` at file scope.
- [ ] Spec uses `page.touchscreen.tap(x, y)` (not `page.tap` or `page.mouse.click`) for the touch test.
- [ ] If `data-testid="controls"` was needed for the layout-stacking locator, it's added to `Controls.tsx`'s root wrapper and asserted in `Controls.spec.tsx`.
- [ ] No manual `<meta name="viewport">` tag in `layout.tsx`.
- [ ] `pnpm nx lint web`, `pnpm nx test web`, `pnpm nx typecheck web`, `pnpm nx e2e @cgol-scaffold/web-e2e --project=chromium` all pass.
- [ ] No file outside `apps/web/src/` and `apps/web-e2e/src/` is modified.
- [ ] Sprint-status will be updated by the orchestrator.

---

## Out of scope

- Tablet (768px, 1024px) breakpoints. Architecture's responsive contract is desktop + 375px portrait; the `>=640px` side-by-side breakpoint already covers tablet/desktop.
- Landscape mobile (667×375). The brief specifies portrait only.
- Pinch-zoom interaction with the canvas. Out of MVP.
- iOS Safari quirks (100vh issue, etc.). Not specified by NFR1.
- Visual-regression snapshots at 375px. Brittle.
- Touch-target audit beyond what the existing button sizing provides. Story 4.2 covers a11y baseline.
- Performance at 375px (frame budget on a real mobile CPU). NFR4 is desktop-targeted; mobile is "usable," not "60fps."

---

## Files expected to be created or modified

| File | Action |
| --- | --- |
| `apps/web/src/app/layout.tsx` | modified — add typed `viewport` export |
| `apps/web-e2e/src/e2e/responsive.spec.ts` | created — three tests for AC-1/2/3 |
| `apps/web/src/components/Controls.tsx` | possibly modified — add `data-testid="controls"` to root wrapper if no stable locator exists today |
| `apps/web/src/components/Controls.spec.tsx` | possibly modified — assert testid presence (one line) |

No file outside `apps/web/src/` and `apps/web-e2e/src/` is created or modified.

---

## References

- `docs/planning-artifacts/epics.md` — Story 4.3 ACs (mirrored verbatim, plus AC-3 stacking-layout assertion)
- `docs/planning-artifacts/architecture.md` — responsive layout strategy (375px portrait + ≥640px side-by-side breakpoint)
- `docs/planning-artifacts/prd.md` FR11 (responsive layout: usable on desktop and 375px portrait), NFR1 (verified by Playwright spec at mobile viewport)
- `docs/project-context.md` rule #19 (Playwright assertions tolerate timing drift)
- Next.js viewport metadata: https://nextjs.org/docs/app/api-reference/functions/generate-viewport
- Playwright touch emulation: https://playwright.dev/docs/touch-events
- `docs/implementation-artifacts/3-1-page-shell-canvas-size-form-and-responsive-layout.md` — responsive breakpoints
- `docs/implementation-artifacts/3-2-canvas-render-and-click-tap-to-toggle-cells.md` — `pointerdown` handler
- `docs/implementation-artifacts/4-1-playwright-happy-path-e2e-spec.md` — locator vocabulary; counter-based verification approach
