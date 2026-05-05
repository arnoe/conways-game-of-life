---
story_id: 4.1
epic: 4
title: Playwright happy-path E2E spec
status: ready-for-dev
priority: MVP
estimated_effort: M
fr_nfr_coverage: [NFR7]
inputDocuments:
  - docs/planning-artifacts/epics.md
  - docs/planning-artifacts/architecture.md
  - docs/planning-artifacts/prd.md
  - docs/project-context.md
---

# Story 4.1 — Playwright happy-path E2E spec

**Status:** `ready-for-dev`
**Epic:** 4 — E2E, accessibility, and responsive polish
**Priority:** MVP
**Effort:** M

---

## User story

**As** the panel,
**I want** a Playwright spec that drives the canonical happy path the README specifies,
**So that** I can verify end-to-end that the app actually works without running it manually.

---

## Acceptance criteria

Copied verbatim from `docs/planning-artifacts/epics.md` Story 4.1, with stable IDs added.

- **AC-1** — **Given** the spec at `apps/web-e2e/src/e2e/happy-path.spec.ts`, **when** the spec runs, **then** it navigates to `/`, sets the canvas size to 10×10, clicks three adjacent cells to form a horizontal blinker, clicks Play, and asserts that the generation counter (located by `data-testid="gen-count"`) reaches `>= 1` within a generous polling window.

- **AC-2** — **Given** the spec uses `expect.poll` or `toHaveText` with a generous timeout, **when** CI runner timing varies, **then** the spec does not flake on exact-frame assertions (no hard-coded sleeps; no exact-counter assertions like "must equal 5").

- **AC-3** — **Given** the spec is wired into Nx, **when** `pnpm nx e2e web-e2e` is run locally or in CI, **then** the spec passes.

---

## Locked technical decisions

These are decisions Dev does **not** need to relitigate.

### Spec file location and naming (locked)

- **Location:** `apps/web-e2e/src/e2e/happy-path.spec.ts` (per epic AC-1's path).
- **The placeholder `apps/web-e2e/src/example.spec.ts` is DELETED in this story.** It tests the wrong heading ("Welcome") and provides no signal. Replace, do not augment.
- **Single test, single happy path.** Do not add multiple `test()` blocks to this file. A second a11y-flavored Playwright spec lands in Story 4.2; a 375px responsive spec lands in Story 4.3. This file is the chromium happy path only.

### Canvas-state verification approach — chosen: counter-based (option C)

> **SM resolution.** The locked question was: how does the spec verify "canvas is empty" or "cell toggled" without DOM equivalents per cell? Three options:
> (a) read canvas pixel data via `page.evaluate(() => ctx.getImageData(...))`,
> (b) expose a debug `window.__cgol = { getGrid }` hook gated behind `NODE_ENV !== 'production'`,
> (c) verify visible behavior through the generation counter (advance → counter increments; clear → counter resets to 0; randomize-then-step → counter advances and Pause halts it).
>
> **Locked: (c).** Reasons: (a) is brittle to color-scheme tweaks and DPR; (b) leaks debug surface into the production bundle and pollutes the global, which violates project-context rule #4 (no DOM/window touchpoints in sim) — and we'd need to wire it into `apps/web` for the test to read it, breaking the "tests constrain real behavior" principle. The counter is the user-visible source of truth for "the simulation advanced," and the existing `data-testid="gen-count"` (locked in Story 3.3) is the documented hook for E2E. **Do not** add a debug global, do not pixel-sample the canvas, do not add per-cell DOM mirroring.

The spec therefore verifies state by:
- **Cell toggle worked** → indirectly proven when Play causes the counter to advance (a 3-cell blinker is the only way to get the counter moving from a freshly-cleared 10×10 grid; if the click didn't paint, the counter stays at 0 forever and the assertion times out).
- **Pause stopped advancement** → counter text stable across two polled reads with a small wait.
- **Clear reset state** → counter text becomes "Generation: 0".

### Selector strategy — accessible names only (locked)

Each control already has accessible names baked in by Story 3.3 / 3.4 / 3.5. Use Playwright's role/name locators; **do not** use CSS selectors or class names.

| Control | Locator |
| --- | --- |
| Page heading | `page.getByRole('heading', { name: /conway/i, level: 1 })` |
| Width input | `page.getByLabel(/width/i)` |
| Height input | `page.getByLabel(/height/i)` |
| Apply size button | `page.getByRole('button', { name: /apply/i })` |
| Play button | `page.getByRole('button', { name: /^play$/i })` |
| Pause button | `page.getByRole('button', { name: /^pause$/i })` |
| Step button | `page.getByRole('button', { name: /^step$/i })` |
| Clear button | `page.getByRole('button', { name: /^clear$/i })` |
| Randomize button | `page.getByRole('button', { name: /^randomize$/i })` |
| Speed slider | `page.getByRole('slider', { name: /simulation speed/i })` |
| Generation counter | `page.getByTestId('gen-count')` |
| Canvas | `page.getByRole('img', { name: /grid/i })` *or* `page.locator('canvas')` if no role on the canvas yet — see Story 4.2 for the canvas a11y description; in 4.1 use `page.locator('canvas')` only if `getByRole` cannot find it |

**`data-testid` is allowed only on the gen-count span** (Story 3.3 baked it in). Everything else is role/name. This is the criterion the brief expects under "tests constrain real behavior."

### Cell-toggle coordinates — deterministic, computed from `boundingBox()`

The 10×10 grid renders into the canvas; the canvas's CSS size is responsive. To click an exact cell, compute the pixel coordinate from `canvas.boundingBox()`:

```ts
const canvas = page.locator('canvas');
const box = await canvas.boundingBox();
if (!box) throw new Error('canvas not visible');
const cellW = box.width / 10;
const cellH = box.height / 10;
// Center of cell (col, row): (box.x + (col + 0.5) * cellW, box.y + (row + 0.5) * cellH)
```

For the horizontal blinker on a 10×10 grid, click cells `(4, 5)`, `(5, 5)`, `(6, 5)` (centered, three-in-a-row). Use `page.mouse.click(x, y)` rather than `canvas.click({ position })`, because Playwright's `position` is relative to the bounding box but cell coords are easier to express in absolute terms here.

### `expect.poll` for the counter assertion (locked, AC-2)

Do **not** use `await page.waitForTimeout(...)` followed by an exact-value assertion. Use polling:

```ts
await expect.poll(
  async () => Number(await page.getByTestId('gen-count').innerText()),
  { timeout: 5000, intervals: [100, 200, 500] }
).toBeGreaterThanOrEqual(1);
```

The default 10 gen/sec means a counter of `>= 1` should arrive within ~150ms. The 5s timeout is generous slack for slow CI runners. **Never** assert `toBe(5)` or any exact value. Project-context rule #19.

### Playwright project — chromium only in CI; full set still available locally

`apps/web-e2e/playwright.config.ts` already declares chromium, firefox, webkit. **Do not modify the config in this story.** Story 1.5's CI workflow runs only chromium (`pnpm nx e2e web-e2e --project=chromium` shape, or the equivalent passed via env). Local devs can still run the spec across all three projects with `pnpm nx e2e web-e2e`.

### `webServer` block — already configured

`apps/web-e2e/playwright.config.ts` already boots `pnpm exec nx run @cgol-scaffold/web:dev` on `http://localhost:3000` with `reuseExistingServer: true`. **Do not** add a separate `pnpm dev` step in CI; the Playwright runner handles it.

### File layout

```
apps/web-e2e/src/
  e2e/
    happy-path.spec.ts                  # NEW — single happy-path test
  example.spec.ts                       # DELETED
```

The `e2e/` subdirectory is a new convention introduced here so future specs (Story 4.2 keyboard, Story 4.3 responsive) have a home. `playwright.config.ts` already points at `./src` via `testDir: './src'`, so the subdirectory is auto-discovered without config changes.

---

## Test plan

This story IS the test. The "test plan" here is the spec's structure, not separate Jest assertions.

### `apps/web-e2e/src/e2e/happy-path.spec.ts` — single test

`test('happy path: paint a blinker, run it, pause, clear', ...)`

Steps in order, with assertions interleaved:

1. **Navigate.** `await page.goto('/')`.
2. **Heading visible.** `await expect(page.getByRole('heading', { level: 1, name: /conway/i })).toBeVisible()`.
3. **Set canvas size.** Fill width=10, height=10, click Apply. (Defaults are 30×30; the spec explicitly resizes to 10×10 per AC-1.)
   - `await page.getByLabel(/width/i).fill('10')`
   - `await page.getByLabel(/height/i).fill('10')`
   - `await page.getByRole('button', { name: /apply/i }).click()`
4. **Confirm counter is 0 after resize.** `await expect(page.getByTestId('gen-count')).toHaveText(/^0$/)` — Story 3.1's pause-and-clear-on-resize behavior is verified incidentally.
5. **Compute canvas bounding box and click three cells to form a horizontal blinker.** `(4,5), (5,5), (6,5)` cell coords → pixel coords via the formula above. Use `page.mouse.click(...)` for each. Add a tiny `await page.waitForTimeout(20)` between clicks if click-then-redraw timing flakes (avoid if not needed; project-context rule #19 says no hard sleeps for *assertions* — but small waits between user actions are acceptable for synthesized input).
6. **Click Play.** `await page.getByRole('button', { name: /^play$/i }).click()`.
7. **Assert counter advances past 0.** `await expect.poll(...).toBeGreaterThanOrEqual(1)` per the locked snippet above.
8. **Click Pause.** `await page.getByRole('button', { name: /^pause$/i }).click()`.
9. **Capture paused counter value.** `const pausedAt = Number(await page.getByTestId('gen-count').innerText())`.
10. **Wait briefly and assert counter is stable.** `await page.waitForTimeout(400)`; then `await expect(page.getByTestId('gen-count')).toHaveText(String(pausedAt))`. (This proves Pause actually halted the loop.)
11. **Click Clear.** `await page.getByRole('button', { name: /^clear$/i }).click()`.
12. **Assert counter is 0.** `await expect(page.getByTestId('gen-count')).toHaveText(/^0$/)`.
13. **Confirm Play is back (Pause flipped back).** `await expect(page.getByRole('button', { name: /^play$/i })).toBeVisible()`.

That is the spec. One `test()` block. No nested `describe`. No additional tests in this file.

### What this spec does NOT verify (deferred to other stories)

- **Keyboard reachability / Tab order** — Story 4.2.
- **375px responsive layout** — Story 4.3.
- **Speed slider mid-run change** — covered by 3.5's Jest integration test; not re-asserted in E2E.
- **Randomize behavior** — counter-reset semantics live in unit + integration tests; happy path doesn't need a random starting state.
- **Step button** — covered by 3.3's Jest integration test.
- **Per-cell color / pixel-level rendering** — out of scope for E2E; not in NFR7's signal target.

---

## Dev notes

### Hard rules (Epic 4-wide)

- **Do not modify `apps/web-e2e/playwright.config.ts`** — webServer, baseURL, projects are correct. CI's chromium-only filter lives in the workflow file (Story 1.5), not the config.
- **Do not modify `libs/sim/`.** Frozen.
- **Do not modify `apps/web/`** unless a missing accessible name forces it. If `getByRole({ name: ... })` fails for any of the locators above, **stop and confirm** — the failure is a Story 3.x AC-violation, not a Story 4.1 fix-up. Fix the source label in `apps/web/src/components/<Component>.tsx`, write the fix into this story's commit, and call it out in the PR description as "follow-up to Story 3.x baseline."
- **Use accessible-name locators only.** No `.locator('.controls__play-btn')` or similar. If a locator is hard to express, that's a Story 3.x defect — see above.
- **`expect.poll` over `waitForTimeout` for assertions.** Project-context rule #19.
- **Single test, single file.** No "happy-path-2," no "happy-path-with-randomize."

### Cross-story coordination

- **Builds on Story 3.3** — `data-testid="gen-count"` and the Play/Pause button accessible names come from that story.
- **Builds on Story 3.4** — Clear button accessible name comes from that story.
- **Builds on Story 1.5** — chromium-only CI filter lives in the workflow; this spec just runs.
- **Story 4.2** will add a separate `keyboard.spec.ts` (or a sibling test file) for Tab-order verification.
- **Story 4.3** will add a separate `responsive.spec.ts` for the 375px viewport assertion.

### Algorithmic guidance — full spec shape

```ts
// apps/web-e2e/src/e2e/happy-path.spec.ts
import { expect, test } from '@playwright/test';

test('happy path: paint a blinker, run it, pause, clear', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: /conway/i })).toBeVisible();

  await page.getByLabel(/width/i).fill('10');
  await page.getByLabel(/height/i).fill('10');
  await page.getByRole('button', { name: /apply/i }).click();

  await expect(page.getByTestId('gen-count')).toHaveText(/^0$/);

  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas not visible');
  const cellW = box.width / 10;
  const cellH = box.height / 10;
  const cellCenter = (col: number, row: number) => ({
    x: box.x + (col + 0.5) * cellW,
    y: box.y + (row + 0.5) * cellH,
  });

  for (const [c, r] of [[4, 5], [5, 5], [6, 5]] as const) {
    const { x, y } = cellCenter(c, r);
    await page.mouse.click(x, y);
  }

  await page.getByRole('button', { name: /^play$/i }).click();

  await expect
    .poll(async () => Number(await page.getByTestId('gen-count').innerText()), {
      timeout: 5000,
      intervals: [100, 200, 500],
    })
    .toBeGreaterThanOrEqual(1);

  await page.getByRole('button', { name: /^pause$/i }).click();

  const pausedAt = Number(await page.getByTestId('gen-count').innerText());
  await page.waitForTimeout(400);
  await expect(page.getByTestId('gen-count')).toHaveText(String(pausedAt));

  await page.getByRole('button', { name: /^clear$/i }).click();

  await expect(page.getByTestId('gen-count')).toHaveText(/^0$/);
  await expect(page.getByRole('button', { name: /^play$/i })).toBeVisible();
});
```

### What NOT to do here

- **Do not** add `window.__cgol = { getGrid }` debug hooks. Counter-based verification is sufficient.
- **Do not** read canvas `getImageData` to verify cell state. Brittle, and the counter already proves advancement.
- **Do not** add `test.describe.configure({ mode: 'serial' })` blocks; one test doesn't need ordering hints.
- **Do not** add visual-regression screenshots. Out of scope; brittle on different CI runners.
- **Do not** add `axe-core` here — Story 4.2 handles a11y verification (and per the user-task brief, axe-core is NOT being added; we keep a11y lean per architecture).
- **Do not** use `await page.locator('canvas').click({ position: ... })` and assume `position` is reliable across DPR — use `boundingBox()` + `page.mouse.click()`.
- **Do not** assert exact counter values like `toHaveText('5')`. Use `>= 1` polling.
- **Do not** modify `playwright.config.ts`, `apps/web-e2e/project.json`, or any CI workflow file in this story.

---

## Definition of done

- [ ] `apps/web-e2e/src/e2e/happy-path.spec.ts` exists with the single test described in the test plan.
- [ ] `apps/web-e2e/src/example.spec.ts` is **deleted**.
- [ ] All locators use `getByRole`, `getByLabel`, or `getByTestId('gen-count')` (the only allowed `data-testid` in the spec).
- [ ] No `await page.waitForTimeout(...)` precedes an assertion (small waits between user actions are acceptable; assertions use `expect.poll` or `expect(...).toHaveText(...)` with default retries).
- [ ] `pnpm nx e2e @cgol-scaffold/web-e2e --project=chromium` passes locally.
- [ ] CI's E2E job (Story 1.5) passes against this spec. (The CI workflow itself is unchanged; this story only adds the spec.)
- [ ] No file outside `apps/web-e2e/src/` is created or modified.
- [ ] Sprint-status will be updated by the orchestrator.

---

## Out of scope

- Multiple happy-path variations (randomize-then-clear, step-only, etc.) — the brief asks for one E2E covering the canonical flow; padding is a fail signal.
- Visual regression — out of MVP.
- Cross-browser CI matrix — chromium-only by Story 1.5 lock.
- A11y assertions — Story 4.2.
- Mobile viewport — Story 4.3.
- `window.__cgol` debug hook — explicitly rejected per "Locked technical decisions" above.
- `axe-core` — explicitly rejected (architecture preference, kept lean).

---

## Files expected to be created or modified

| File | Action |
| --- | --- |
| `apps/web-e2e/src/e2e/happy-path.spec.ts` | created |
| `apps/web-e2e/src/example.spec.ts` | deleted |

No file outside `apps/web-e2e/src/` is created, modified, or deleted.

---

## References

- `docs/planning-artifacts/epics.md` — Story 4.1 ACs (mirrored verbatim)
- `docs/planning-artifacts/architecture.md` — E2E strategy section (Playwright via `@nx/playwright`, chromium-only CI)
- `docs/planning-artifacts/prd.md` — NFR7 (CI four-check gate, of which this is the E2E half)
- `docs/project-context.md` rule #19 (Playwright assertions tolerate timing drift; `expect.poll` over hard sleeps; `>= 1` over exact values)
- `docs/implementation-artifacts/3-3-play-pause-step-controls-and-generation-counter.md` — `data-testid="gen-count"` baked in; Play/Pause/Step accessible names
- `docs/implementation-artifacts/3-4-clear-and-randomize-controls.md` — Clear/Randomize accessible names
- `docs/implementation-artifacts/3-1-page-shell-canvas-size-form-and-responsive-layout.md` — Width/Height/Apply form labels
- `apps/web-e2e/playwright.config.ts` — webServer + projects (read-only in this story)
