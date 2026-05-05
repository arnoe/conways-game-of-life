---
story_id: 4.2
epic: 4
title: Keyboard reachability and accessible-name audit
status: ready-for-dev
priority: MVP
estimated_effort: M
fr_nfr_coverage: [FR12, NFR6]
inputDocuments:
  - docs/planning-artifacts/epics.md
  - docs/planning-artifacts/architecture.md
  - docs/planning-artifacts/prd.md
  - docs/project-context.md
---

# Story 4.2 — Keyboard reachability and accessible-name audit

**Status:** `ready-for-dev`
**Epic:** 4 — E2E, accessibility, and responsive polish
**Priority:** MVP
**Effort:** M

---

## User story

**As** a keyboard-only user,
**I want** every control reachable via Tab and operable via Enter/Space (or Arrow on the slider) with a visible focus indicator,
**So that** the app is usable without a mouse.

---

## Acceptance criteria

Copied from `docs/planning-artifacts/epics.md` Story 4.2, with stable IDs added. Note: the epic's AC-4 references `@axe-core/playwright`. **This story explicitly does NOT add axe-core** (architecture preference per the user-task brief — keep a11y lean, no full a11y testing library). AC-4 is reframed as a manual-coverage assertion: zero serious/critical violations against the audit checklist below, verified through targeted Playwright + Jest assertions.

- **AC-1** — **Given** the page is loaded, **when** the user presses Tab repeatedly from the document start, **then** focus moves through Width input, Height input, Apply button, Play/Pause, Step, Clear, Randomize, Speed slider in a logical order, with each control receiving a visible focus ring meeting WCAG AA contrast.

- **AC-2** — **Given** keyboard focus on a button, **when** the user presses Enter or Space, **then** the button activates.

- **AC-3** — **Given** keyboard focus on the speed slider, **when** the user presses Arrow Left or Arrow Right, **then** the rate decrements or increments by one gen/sec.

- **AC-4** — **Given** the audit checklist below, **when** the page is inspected, **then** there are zero serious/critical accessibility findings against the checklist's WCAG 2.1 AA criteria, and any deviations (notably the canvas keyboard-fallback) are documented in the README per NFR6.

- **AC-5** — **Given** every interactive control, **when** inspected, **then** it has a discernible accessible name (visible label or `aria-label`).

---

## Locked technical decisions

These are decisions Dev does **not** need to relitigate.

### Audit-then-fix scope (locked)

Stories 3.3 / 3.4 / 3.5 already shipped a11y baselines (real `<button>` elements with text labels, `aria-pressed` on Play/Pause, `aria-live="polite"` + `data-testid="gen-count"` on the counter, `aria-label` + `aria-valuemin/max/now` on the slider). This story is **audit, fix, verify** — not "build a11y from scratch." The expected delta is small.

#### Audit checklist (run this list, find what's missing, fix it)

| # | Criterion | Verified by |
| --- | --- | --- |
| 1 | Every interactive control reachable by Tab | Playwright Tab-walk |
| 2 | Tab order is logical: Width → Height → Apply → Play/Pause → Step → Clear → Randomize → Speed slider | Playwright Tab-walk asserts each step |
| 3 | Every control has a visible focus indicator (`:focus-visible` outline / box-shadow) meeting WCAG AA contrast | CSS Module `:focus-visible` blocks; Playwright screenshot diff is **out of scope**; verify by reading the rendered class list and the locked CSS |
| 4 | Every control has a discernible accessible name | Jest RTL `getByRole({ name })` queries (some already exist; re-verify) |
| 5 | Buttons activate on Enter and Space | Jest RTL `userEvent.keyboard('{Enter}')` / `'{Space}'` |
| 6 | Slider responds to ArrowLeft / ArrowRight (browser-native; verify in Playwright since jsdom doesn't simulate it reliably) | Playwright keyboard-walk |
| 7 | Canvas keyboard fallback is **documented**, not implemented | A visually-hidden description + README note |
| 8 | Generation counter announces changes politely | `aria-live="polite"` already in place; re-verify |
| 9 | No color-only signals (alive vs. dead is color, but the brief allows this since the canvas is the artifact; document) | Inspection + README note |
| 10 | Form inputs (Width, Height) have associated `<label>` or `aria-label` | RTL `getByLabel` succeeds (already shipped) |

### Fixes Dev is most likely to need

These are the **expected** delta. Dev verifies each in audit; if a baseline already covers it (e.g., `aria-pressed` on Play/Pause from Story 3.3), there is no fix to apply, just a regression test to add.

1. **Visible `:focus-visible` outlines on all buttons and inputs.** Each component's CSS Module currently relies on browser defaults. **Add a project-level focus-visible style** (CSS Module rules per component, OR a shared rule in `apps/web/src/app/global.css`) that gives a 2px solid outline in a high-contrast color (cyan-on-near-black per architecture §7.5: `outline: 2px solid #67e8f9; outline-offset: 2px;`). Test with `:focus-visible` (not `:focus`) so mouse clicks don't paint the ring.
   - **Locked location:** add to `apps/web/src/app/global.css` as a base rule `:where(button, input, [role="slider"]):focus-visible { outline: 2px solid #67e8f9; outline-offset: 2px; }`. The `:where()` keeps specificity at zero so component-level CSS Modules can still override if a specific design demands it. **Do not** put per-component `:focus-visible` rules in each `.module.css` if the global rule covers all interactive elements — duplication is a smell.
   - **Why global.css and not a CSS Module:** focus styles are app-wide concern; `:focus-visible` doesn't depend on component-local class names; one place is easier to evolve.

2. **Canvas keyboard-fallback documentation (no canvas keyboarding).** The canvas is mouse-only by design (per the architecture; canvas keyboarding is a much larger feature out of MVP scope). Add a visually-hidden `<p>` (or attach `aria-describedby` to the canvas) that says: *"Canvas cells are toggled by clicking or tapping. Keyboard cell-painting is not supported in this version."* This sets the right expectation for screen-reader users and is the documented WCAG 2.1 AA deviation per NFR6.
   - **Locked location:** in `apps/web/src/components/Canvas.tsx`, add a sibling `<p className={styles.srOnly}>` and link via `aria-describedby="canvas-help"` on the `<canvas>` element. The CSS `.srOnly` class uses the standard visually-hidden recipe (clip, position absolute, width 1px, etc.).

3. **Tab order verification — no `tabIndex` shenanigans.** The natural DOM order across the page is: GridSizeForm (Width, Height, Apply) → Controls (Play/Pause, Step, Clear, Randomize) → SpeedSlider. **This already matches the locked Tab order.** Do **not** add `tabIndex={1}`, `tabIndex={2}`, etc. — positive `tabIndex` values are a WCAG anti-pattern. If the natural Tab order doesn't match the locked sequence, fix it by reordering elements in `page.tsx`, not by hacking tabindex.
   - **Verify by Playwright:** focus body, repeatedly press Tab, assert `page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent)` matches the expected sequence.

4. **`aria-disabled` mirroring on disabled Step button.** Story 3.3 sets `disabled={running}` and `aria-disabled={running}`. Verify this; a disabled button without `aria-disabled` is fine (the native `disabled` attribute is announced) but the existing pattern is more explicit. **No change expected unless audit reveals a gap.**

5. **Slider ArrowLeft/ArrowRight — verify in Playwright (jsdom doesn't simulate it).** Story 3.5 noted that jsdom may not fire native arrow-key behavior on `<input type="range">`. AC-3 of this story relies on Playwright running in a real browser, which DOES simulate it. The Jest test for the slider can document the limitation; Playwright verifies.

### Test split — Jest for what jsdom can verify; Playwright for the rest

> **SM resolution.** The user-task brief asked for "component tests in apps/web that confirm focus styles render (snapshot of computed style if jsdom supports it)." jsdom does not paint pixels and does not reliably resolve `:focus-visible` in CSS — checking computed style on a focused button gives unreliable results because there is no layout/paint pass. **Decision:** the focus-visible style is verified by reading the CSS source (it's there), the Playwright Tab-walk verifies that focus lands where expected, and the README documents the visible-focus-ring requirement. **Do not** add jsdom snapshot tests for `getComputedStyle(el).outline` — they are noise.

| Verification | Where |
| --- | --- |
| Tab-order sequence | Playwright `keyboard.spec.ts` |
| Each control has an accessible name | Jest RTL (existing component tests already cover this; add a single page-level integration test that asserts `getByRole({ name })` resolves all 8 controls in one render) |
| Buttons activate on Enter and Space | Jest RTL `userEvent.keyboard('{Enter}')` and `'{Space}'` per button |
| Slider Arrow ←/→ | Playwright `keyboard.spec.ts` (jsdom unreliable) |
| `:focus-visible` outline rendered visually | **Read source** (CSS Module / global.css contains the rule); not snapshotted |
| Visually-hidden canvas help text | Jest RTL — assert `<p id="canvas-help">` is in the DOM with the expected text and the canvas has `aria-describedby="canvas-help"` |

### Spec file location

```
apps/web-e2e/src/
  e2e/
    happy-path.spec.ts        # Story 4.1 — untouched
    keyboard.spec.ts          # NEW — this story
```

A separate file keeps the happy path tight (Story 4.1 hard rule) and lets the keyboard test focus on Tab-walk + slider arrow keys.

### File layout

```
apps/web/src/
  app/
    global.css                            # MODIFIED — add :focus-visible base rule
    page.spec.tsx                         # MODIFIED — add an integration test that all 8 controls have accessible names in one render
  components/
    Canvas.tsx                            # MODIFIED — add aria-describedby + visually-hidden help text
    Canvas.module.css                     # MODIFIED — add .srOnly class
    Canvas.spec.tsx                       # MODIFIED — assert aria-describedby + help text are present
    Controls.spec.tsx                     # MODIFIED — add Enter/Space activation tests for Play/Pause/Step/Clear/Randomize
    SpeedSlider.spec.tsx                  # MODIFIED — note: arrow-key behavior is verified in Playwright; document this in spec comment

apps/web-e2e/src/
  e2e/
    keyboard.spec.ts                      # NEW — Tab-walk + slider arrow keys
```

---

## Test plan

### `apps/web/src/components/Canvas.spec.tsx` — additions

`describe('Canvas — a11y (Story 4.2)')`
- `it('AC-5: canvas has aria-describedby pointing at a help text element')` — `getByRole('img'?) || locator('canvas').getAttribute('aria-describedby')` resolves to `'canvas-help'`.
- `it('AC-5: canvas help text is in the DOM and explains mouse-only interaction')` — `getByText(/click(?:ing)?.*tap.*toggle/i)` (or the chosen exact wording) is present and visually hidden (assert the `.srOnly` class is applied).

### `apps/web/src/components/Controls.spec.tsx` — additions

`describe('Controls — keyboard activation (Story 4.2)')`
- `it('AC-2: Play button activates on Enter')` — focus, `userEvent.keyboard('{Enter}')`, assert `onPlay` mock called.
- `it('AC-2: Play button activates on Space')` — same with `{ }` (Space).
- `it('AC-2: Step button activates on Enter when not running')`.
- `it('AC-2: Step button does NOT activate on Enter when running (disabled)')`.
- `it('AC-2: Clear button activates on Enter and Space')`.
- `it('AC-2: Randomize button activates on Enter and Space')`.

### `apps/web/src/app/page.spec.tsx` — additions

`describe('page — accessible-name audit (Story 4.2 AC-5)')`
- `it('AC-5: all 8 interactive controls are findable by accessible name in one render')` — render the full page; assert that the following queries all return non-null:
  - `getByLabel(/width/i)`
  - `getByLabel(/height/i)`
  - `getByRole('button', { name: /apply/i })`
  - `getByRole('button', { name: /^play$|^pause$/i })`
  - `getByRole('button', { name: /^step$/i })`
  - `getByRole('button', { name: /^clear$/i })`
  - `getByRole('button', { name: /^randomize$/i })`
  - `getByRole('slider', { name: /simulation speed/i })`
  
  **One assertion block; if any locator throws, AC-5 fails for that control specifically.**

### `apps/web-e2e/src/e2e/keyboard.spec.ts` — NEW

`test.describe('keyboard reachability', ...)` with three tests:

**Test 1 — `'AC-1: Tab order matches the locked sequence'`**
1. Navigate to `/`.
2. Focus the body via `await page.keyboard.press('Tab')` once (this moves to the first focusable element).
3. Read `await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent ?? document.activeElement?.tagName)` and push to a `seenOrder` array.
4. Press Tab 7 more times, push each focused element's identifier.
5. Assert `seenOrder` matches: Width input, Height input, Apply, Play (or Pause), Step, Clear, Randomize, Speed slider — using flexible matchers (regex or `expect(seenOrder[i]).toMatch(...)`).

**Test 2 — `'AC-3: Slider responds to ArrowLeft / ArrowRight'`**
1. Navigate, Tab through to the slider.
2. Read the slider's `aria-valuenow` (default 10).
3. `await page.keyboard.press('ArrowRight')`; assert `aria-valuenow` is 11.
4. `await page.keyboard.press('ArrowLeft')`; assert `aria-valuenow` is 10.
5. (Optional) Hold ArrowRight via `page.keyboard.down('ArrowRight')` for 200ms then `up`, assert value increased; not strictly necessary for AC.

**Test 3 — `'AC-1 + AC-5: every focusable element has an accessible name'`**
1. Navigate.
2. Iterate Tab 8 times; for each focused element, assert `await page.evaluate(() => { const el = document.activeElement; return el?.getAttribute('aria-label') || el?.textContent?.trim() || (el as HTMLInputElement)?.labels?.[0]?.textContent?.trim() || null; })` is non-empty.

### What this audit explicitly does NOT do

- **No axe-core integration.** The user-task brief made this call. Architecture's lean a11y posture says: cover the criteria with targeted assertions, document deviations.
- **No screenshot diff for the focus ring.** Brittle on different CI runners' font rendering.
- **No keyboard cell-painting on the canvas.** That would be ~half a day of work for `Arrow`/`Enter` cell selection logic, a focus indicator inside the canvas, and screen-reader announcements per cell. Out of MVP scope; documented as a deliberate skip.

---

## Dev notes

### Hard rules (Epic 4-wide)

- **Do not** add axe-core (`@axe-core/playwright`) or any other a11y testing library. The user-task brief locks this.
- **Do not** add positive `tabIndex` values. WCAG anti-pattern. If Tab order is wrong, reorder DOM nodes.
- **Do not** modify Playwright config. The keyboard spec runs under the same chromium project as Story 4.1.
- **Do not** modify `libs/sim/`.
- **Do not** modify `_bmad/`, `.claude/`, `.cursor/`, `.opencode/`, `AGENTS.md`, `CLAUDE.md`.
- **`global.css` is the right home for the focus-visible base rule** — not per-component CSS Modules. Project-level a11y baseline.

### Cross-story coordination

- **Builds on Stories 3.1, 3.3, 3.4, 3.5.** Each shipped a piece of a11y; this story closes the audit.
- **Builds on Story 4.1** — re-uses the locator vocabulary (role + name) and the chromium project.
- **No follow-up needed in 4.3 or 4.4** — keyboard a11y is closed here. README's a11y section in 4.4 references this story's documented canvas-fallback deviation.

### Locked CSS — `apps/web/src/app/global.css` addition

Append (do not replace existing rules):

```css
/* Story 4.2 — visible focus indicator for all interactive controls (WCAG 2.1 AA) */
:where(button, input, [role="slider"]):focus-visible {
  outline: 2px solid #67e8f9;
  outline-offset: 2px;
}
```

`:where()` keeps the rule's specificity at 0, so component-local CSS Modules can override if needed. The cyan color matches architecture §7.5's "cyan-on-near-black" palette.

### Locked CSS — `apps/web/src/components/Canvas.module.css` addition

Append:

```css
.srOnly {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

Standard visually-hidden recipe.

### Locked JSX — `apps/web/src/components/Canvas.tsx` addition

The canvas element gets `aria-describedby="canvas-help"`, and an adjacent `<p id="canvas-help" className={styles.srOnly}>` carries the help text:

```tsx
<>
  <canvas
    ref={canvasRef}
    aria-describedby="canvas-help"
    /* existing props ... */
  />
  <p id="canvas-help" className={styles.srOnly}>
    Click or tap cells on the grid to toggle them between alive and dead.
    Keyboard cell-painting is not supported in this version.
  </p>
</>
```

### Cross-story note: `apps/web/src/components/SpeedSlider.spec.tsx`

Story 3.5 already documented the jsdom limitation on `<input type="range">` arrow-key behavior. This story does NOT need to "fix" the Jest test — only confirm the Playwright verification (Test 2 of `keyboard.spec.ts`) is in place. Add a one-line comment in `SpeedSlider.spec.tsx` next to the arrow-key test referencing `apps/web-e2e/src/e2e/keyboard.spec.ts` for the real-browser verification. **Do not** rewrite the existing Jest tests.

### What NOT to do here

- **Do not** add axe-core, jest-axe, or any automated a11y scanner. Lean by choice.
- **Do not** add positive `tabIndex` on any element.
- **Do not** make the canvas keyboard-controllable. Out of scope; explicitly documented as a deliberate skip in the README (Story 4.4).
- **Do not** snapshot computed styles in jsdom — unreliable.
- **Do not** add `role="region"` or other ARIA scaffolding beyond what's already in place. The page is small; over-decorating ARIA hurts readability.
- **Do not** modify `playwright.config.ts`, `apps/web-e2e/project.json`, or any CI workflow.
- **Do not** modify `libs/sim/`.
- **Do not** rename `data-testid="gen-count"` (Story 4.1 spec depends on it).

---

## Definition of done

- [ ] `apps/web/src/app/global.css` includes the `:focus-visible` base rule for buttons, inputs, and `[role="slider"]`.
- [ ] `apps/web/src/components/Canvas.tsx` exposes `aria-describedby="canvas-help"` and renders the visually-hidden help text below the canvas.
- [ ] `apps/web/src/components/Canvas.module.css` includes the `.srOnly` class.
- [ ] `apps/web/src/components/Canvas.spec.tsx` asserts the `aria-describedby` linkage and the help text content.
- [ ] `apps/web/src/components/Controls.spec.tsx` adds Enter/Space activation tests for Play/Pause, Step, Clear, Randomize (and confirms Step is inert when disabled).
- [ ] `apps/web/src/app/page.spec.tsx` adds the page-level "all 8 controls findable by accessible name" assertion.
- [ ] `apps/web-e2e/src/e2e/keyboard.spec.ts` exists with the three tests in the test plan: Tab-order sequence, slider Arrow Left/Right, every focused element has a name.
- [ ] Tab order is achieved through DOM order alone — no positive `tabIndex` values anywhere.
- [ ] No axe-core, jest-axe, or other a11y library is added.
- [ ] `pnpm nx lint web`, `pnpm nx test web`, `pnpm nx typecheck web`, `pnpm nx e2e @cgol-scaffold/web-e2e --project=chromium` all pass.
- [ ] No file outside `apps/web/src/` and `apps/web-e2e/src/` is modified.
- [ ] Sprint-status will be updated by the orchestrator.

---

## Out of scope

- Canvas keyboard-driven cell painting (Arrow keys to move a cursor, Enter to toggle). Out of MVP; documented as a deliberate skip in Story 4.4's README.
- Screen-reader announcement for every cell change. Counter announces; per-cell would be noise.
- High-contrast / forced-colors mode tuning beyond the cyan focus ring.
- Skip-to-content link. The page has only one main region; not warranted.
- Reduced-motion preference handling. The simulation has no decorative animation; cell flips are intentional.
- axe-core or any other automated scanner. Locked out by user-task brief.
- Visual-regression snapshots of the focus ring.
- Dark-mode toggle. Architecture §7.5 fixes the palette.

---

## Files expected to be created or modified

| File | Action |
| --- | --- |
| `apps/web/src/app/global.css` | modified — add `:focus-visible` base rule |
| `apps/web/src/components/Canvas.tsx` | modified — add `aria-describedby` + visually-hidden help text |
| `apps/web/src/components/Canvas.module.css` | modified — add `.srOnly` class |
| `apps/web/src/components/Canvas.spec.tsx` | modified — assert aria-describedby + help text |
| `apps/web/src/components/Controls.spec.tsx` | modified — Enter/Space activation tests |
| `apps/web/src/components/SpeedSlider.spec.tsx` | modified — comment-only reference to Playwright arrow-key verification |
| `apps/web/src/app/page.spec.tsx` | modified — accessible-name audit assertion |
| `apps/web-e2e/src/e2e/keyboard.spec.ts` | created — Tab-walk + slider arrow keys + name presence |

No file outside `apps/web/src/` and `apps/web-e2e/src/` is modified.

---

## References

- `docs/planning-artifacts/epics.md` — Story 4.2 ACs (mirrored, with axe-core deferral noted)
- `docs/planning-artifacts/architecture.md` §7.5 (cyan-on-near-black palette → focus ring color), accessibility expectations
- `docs/planning-artifacts/prd.md` FR12 (keyboard-accessible controls), NFR6 (WCAG 2.1 AA on controls; document deviations)
- `docs/project-context.md` rule #6 (accessible names baseline; visible focus rings)
- WCAG 2.1 Level AA: Success Criteria 2.1.1 Keyboard, 2.4.3 Focus Order, 2.4.7 Focus Visible, 4.1.2 Name/Role/Value
- `docs/implementation-artifacts/3-3-play-pause-step-controls-and-generation-counter.md` — Play/Pause `aria-pressed`, gen counter `aria-live`
- `docs/implementation-artifacts/3-5-speed-slider-with-raf-accumulator-mid-run-change-without-restart.md` — slider aria-* attributes, jsdom arrow-key limitation
- `docs/implementation-artifacts/4-1-playwright-happy-path-e2e-spec.md` — locator vocabulary reused here
