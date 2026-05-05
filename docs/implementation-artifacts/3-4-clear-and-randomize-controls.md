---
story_id: 3.4
epic: 3
title: Clear and Randomize controls
status: ready-for-dev
priority: MVP
estimated_effort: S
fr_nfr_coverage: [FR3, FR4]
inputDocuments:
  - docs/planning-artifacts/epics.md
  - docs/planning-artifacts/architecture.md
  - docs/planning-artifacts/prd.md
  - docs/project-context.md
---

# Story 3.4 — Clear and Randomize controls

**Status:** `ready-for-dev`
**Epic:** 3 — Web app interactive MVP
**Priority:** MVP
**Effort:** S

---

## User story

**As** Casey,
**I want** one-click Clear and Randomize buttons,
**So that** I can reset to empty or jump to an interesting random starting state without painting cell-by-cell.

---

## Acceptance criteria

Copied verbatim from `docs/planning-artifacts/epics.md` Story 3.4, with stable IDs added.

- **AC-1** — **Given** any grid state and either running or paused, **when** the user activates Clear, **then** every cell is dead, the gen counter resets to 0, and if the simulation was running it is now paused.

- **AC-2** — **Given** any grid state and either running or paused, **when** the user activates Randomize, **then** `randomizeGrid` from `libs/sim` is called with the default density (0.3), the gen counter resets to 0, and if the simulation was running it is now paused.

- **AC-3** — **Given** the controls are rendered, **when** the page is at any supported viewport, **then** both buttons are reachable and operable via mouse, touch, or keyboard (Tab + Enter/Space).

---

## Locked technical decisions

These are decisions Dev does **not** need to relitigate.

### Pause-on-Clear and Pause-on-Randomize (architecture-aligned, locked)

**Both Clear and Randomize set `running = false`** as part of their reducer dispatch. Rationale (per Story 2.4 cross-story note "Story 3.4 (Clear and Randomize controls in the web app) consumes `randomizeGrid`"):

1. **AC-1 and AC-2 explicitly require it** — "if the simulation was running it is now paused."
2. **Without the pause**, Randomize-while-running would replace the grid mid-tick, and the next rAF tick would `step()` on the brand-new randomized state. Visually fine, but the user expects the new state to be the *starting* state — pressing Play again from there is the right interaction model.
3. **Clear-while-running** would otherwise produce one tick of the empty grid (still empty after `step()`) before the user notices anything happened — a confusing UX.

This matches the user-task brief's "recommend yes, to avoid immediately re-rendering" guidance.

### No density UI in MVP (locked)

The Randomize button uses **density = 0.3** (project-context rule #17, FR4). **No density slider, no density input, no density UI in MVP.** The user-task brief asked whether a "compact density input" should ship; the locked answer is **no**. Reasons:

- PRD scope: FR4 says "documented density (~0.3)." It does not require user-adjustable density.
- Time budget: a slider's worth of work — a `<SpeedSlider>` for FR8 already exists in Story 3.5. A density slider would duplicate that surface for marginal user benefit.
- Architecture §10's Open Questions list does not include "density UI" — the architect did not see this as a decision to make.

If a future story wants density UI, it lands as its own ticket.

### Reducer additions (Story 3.4 fills `'clear'` and `'randomize'`)

```typescript
// add to apps/web/src/app/state/simulation-state.ts
import { clearGrid, randomizeGrid } from '@cgol-scaffold/sim';
import { DEFAULT_DENSITY } from '../constants.js'; // 0.3

// in simulationReducer:
case 'clear':
  return {
    ...state,
    grid: clearGrid(state.grid),
    genCount: 0,
    running: false,
  };
case 'randomize':
  return {
    ...state,
    grid: randomizeGrid(state.grid, DEFAULT_DENSITY),
    genCount: 0,
    running: false,
  };
```

**Note on `randomizeGrid`'s `rng` parameter:** Story 2.4 locked the signature as `randomizeGrid(grid, density?, rng?)`. The reducer **does not pass an `rng`** — it relies on the default `Math.random`. This is the lone path through which `Math.random` enters the production runtime, isolated to a single library function with an injectable seam. The reducer remains pure with respect to its inputs `(state, action)`; `randomizeGrid` is the impure call, and that impurity is encapsulated in `libs/sim` (project-context rule #4 — `Math.random` is allowed there as the default RNG).

> **SM resolution on reducer purity.** The reducer dispatching `'randomize'` calls `randomizeGrid(state.grid, 0.3)` which internally invokes `Math.random`. Strictly, this means the reducer is not deterministic for the `'randomize'` action. That's acceptable: the reducer's purity invariant is "given the same `(state, action)`, return the same `state'`" *for tick-driven actions* (which must be reproducible for tests of the simulation core). For user-driven `'randomize'`, non-determinism is the explicit desired behavior. Tests of the `'randomize'` reducer case mock `Math.random` (via `jest.spyOn`) or pass a seeded grid through and assert the live-cell density tolerance, not exact bit equality. The pure-function guarantees in `libs/sim` are unaffected — `randomizeGrid` itself is pure with respect to `(grid, density, rng)`.

### Controls component (extends Story 3.3's `Controls.tsx`)

**Locked: Clear and Randomize buttons live in the same `Controls.tsx` as Play/Pause/Step.** Story 3.3 introduced the file; Story 3.4 adds two buttons to it. **Do NOT** create a separate `ResetControls.tsx` — the visual grouping is one logical control bar.

- **Clear button:** `<button type="button" onClick={onClear}>Clear</button>`. Always enabled (no disabled state — Clear works whether running or paused, per AC-1).
- **Randomize button:** `<button type="button" onClick={onRandomize}>Randomize</button>`. Always enabled.
- Both have visible text labels (no need for `aria-label`).
- Tab order extends Story 3.3's: Width, Height, Apply, Play/Pause, Step, **Clear, Randomize** (Speed slider lands at the end in Story 3.5).

### File layout

```
apps/web/src/
  app/
    page.tsx                              # MODIFIED — add Clear/Randomize dispatch handlers
    state/
      simulation-state.ts                 # MODIFIED — fill 'clear' and 'randomize' reducer cases
      simulation-state.spec.ts            # MODIFIED — add tests for the new cases
  components/
    Controls.tsx                          # MODIFIED — add Clear and Randomize buttons
    Controls.module.css                   # MODIFIED — minor; consistent button styling
    Controls.spec.tsx                     # MODIFIED — add tests for the new buttons
```

---

## Test plan

### `apps/web/src/app/state/simulation-state.spec.ts` — additions for Story 3.4

`describe('simulationReducer — clear (Story 3.4)')`
- `it('AC-1: dispatching clear with a non-empty grid produces an all-dead grid')` — set up grid with several alive cells; dispatch clear; assert `cells.every(c => c === 0)`.
- `it('AC-1: dispatching clear resets genCount to 0')`.
- `it('AC-1: dispatching clear when running=true sets running=false')`.
- `it('AC-1: dispatching clear when paused, with genCount > 0, still resets genCount to 0')`.
- `it('clear preserves grid dimensions')` — width and height unchanged.
- `it('clear allocates a new Grid (immutability)')` — reference-distinct.

`describe('simulationReducer — randomize (Story 3.4)')`
- `it('AC-2: dispatching randomize calls randomizeGrid with the current grid and density 0.3')` — `jest.spyOn` `randomizeGrid` (or wrap `Math.random` with a deterministic seed via `jest.spyOn(Math, 'random').mockReturnValue(0.5)` and assert the resulting grid). Recommended approach: use `jest.spyOn(Math, 'random')` with a deterministic sequence (e.g., always returns 0.1 → all cells alive at density 0.3 since `0.1 < 0.3`). Then assert all cells are alive.
- `it('AC-2: dispatching randomize resets genCount to 0')`.
- `it('AC-2: dispatching randomize when running=true sets running=false')`.
- `it('AC-2: dispatching randomize preserves grid dimensions')`.
- `it('randomize allocates a new Grid (immutability)')`.
- `it('randomize density tolerance — with Math.random unmocked, on a 100×100 grid, alive count is within ±10% of 3000')` — sanity check; flaky-tolerant via wide bounds. **Optional**; the deterministic-mock test above is the canonical assertion.

### `apps/web/src/components/Controls.spec.tsx` — additions for Story 3.4

`describe('Controls — Clear button (Story 3.4)')`
- `it('renders a Clear button with accessible name')`.
- `it('AC-1: clicking Clear calls onClear')`.
- `it('AC-1 (covers AC-3): Clear button is enabled when running=true (works in both states)')`.
- `it('AC-3: Clear button is keyboard-activatable via Enter')` — `userEvent.tab()` until focused, `userEvent.keyboard('{Enter}')`, assert mock called.
- `it('AC-3: Clear button is keyboard-activatable via Space')` — same with `' '`.

`describe('Controls — Randomize button (Story 3.4)')`
- `it('renders a Randomize button with accessible name')`.
- `it('AC-2: clicking Randomize calls onRandomize')`.
- `it('AC-2 (covers AC-3): Randomize button is enabled when running=true (works in both states)')`.
- `it('AC-3: Randomize button is keyboard-activatable via Enter and Space')`.

`describe('Controls — Tab order regression')`
- `it('Tab order is Play/Pause → Step → Clear → Randomize')` — query all buttons in document order, assert the labels match this order. (Story 3.5 will add the slider after Randomize.)

### `apps/web/src/app/page.spec.tsx` — integration additions for Story 3.4

`describe('page (Story 3.4) — Clear integration')`
- `it('AC-1: clicking Clear after painting cells results in an all-dead canvas (verified via gen-count and a recorded fillRect call count)')` — paint 3 cells, click Clear, assert gen-count is 0 and the next render shows zero alive-color fillRects (jest-canvas-mock records).
- `it('AC-1: clicking Clear while running pauses the simulation')` — click Play, advance time, click Clear, advance more, assert no further ticks.

`describe('page (Story 3.4) — Randomize integration')`
- `it('AC-2: clicking Randomize while running pauses and resets genCount to 0')`.
- `it('AC-2: clicking Randomize from the empty default grid produces a non-empty grid (deterministic with mocked Math.random)')`.

---

## Dev notes

### Hard rules (Epic 3-wide)

- **TypeScript strict, no `any`, no `@ts-ignore`.**
- **No external state libs.**
- **`@cgol-scaffold/sim` imports only.** This story uses `clearGrid` and `randomizeGrid` (already exported).
- **Accessible names on every interactive control** — Clear and Randomize have visible text labels.
- **Density default 0.3** — project-context rule #17. **No density UI.**

### Cross-story coordination

- **Builds on Stories 3.1, 3.2, 3.3.** Reducer is extended (cases for clear and randomize filled). Controls.tsx gains two buttons. The rAF loop hook from Story 3.3 already cancels itself when `running` flips to `false`, so Clear and Randomize don't need to interact with the hook directly — flipping `state.running` to `false` is sufficient.
- **Story 3.5 will add a Speed slider** after the Randomize button in the Tab order. This story locks the Tab-order regression test to that exact ordering.
- **Cross-epic dependency: Story 4.1's Playwright happy-path** does NOT use Clear or Randomize directly (it paints a blinker manually), so Story 3.4 doesn't change Story 4.1's spec.

### What NOT to do here

- **Do not** add a density slider, density number input, or any density UI. Locked default 0.3.
- **Do not** add an "Are you sure?" confirmation dialog before Clear or Randomize. Out of PRD scope; adds friction for no benefit.
- **Do not** preserve the genCount across Clear or Randomize. AC-1 and AC-2 explicitly require resetting to 0.
- **Do not** keep `running=true` after Clear or Randomize. AC-1 and AC-2 explicitly require pausing.
- **Do not** dispatch two separate actions (e.g., `'pause'` then `'clear'`). One reducer action handles all three concerns atomically. Two-dispatch sequences risk an intermediate render where the user sees a paused-but-still-populated grid before the clear lands.
- **Do not** call `randomizeGrid` with `(state.dimensions.width, state.dimensions.height)` and a fresh `createGrid` — the locked signature (Story 2.4) takes a `Grid`. Pass `state.grid`; `randomizeGrid` reads `width` and `height` from it and allocates a new `cells` buffer.
- **Do not** seed the RNG in production. The reducer relies on `randomizeGrid`'s default `Math.random`. Tests mock `Math.random` directly or mock the function via `jest.spyOn`.

### Algorithmic guidance — Controls.tsx additions (locked-in-shape)

```tsx
// add to apps/web/src/components/Controls.tsx
interface ControlsProps {
  running: boolean;
  genCount: number;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onClear: () => void;       // NEW in Story 3.4
  onRandomize: () => void;   // NEW in Story 3.4
}

// in JSX, after the Step button:
<button type="button" onClick={onClear}>
  Clear
</button>
<button type="button" onClick={onRandomize}>
  Randomize
</button>
```

The buttons take no extra props beyond their click handlers — no `disabled` state, no aria-pressed, just plain action buttons. Keep them dumb.

---

## Definition of done

- [ ] `apps/web/src/app/state/simulation-state.ts` `'clear'` and `'randomize'` reducer cases are filled per the locked shape.
- [ ] `apps/web/src/app/state/simulation-state.spec.ts` covers both new cases (clear, randomize) with the listed assertions.
- [ ] `apps/web/src/components/Controls.tsx` adds Clear and Randomize buttons with text labels in the locked Tab order (after Step).
- [ ] `apps/web/src/components/Controls.spec.tsx` covers both new buttons (click, keyboard activation, Tab order regression).
- [ ] `apps/web/src/app/page.tsx` wires `onClear={() => dispatch({type:'clear'})}` and `onRandomize={() => dispatch({type:'randomize'})}` into `<Controls>`.
- [ ] Page-level integration test (`page.spec.tsx`) covers the Clear-while-running and Randomize-while-running pause behavior.
- [ ] `pnpm nx lint web`, `pnpm nx test web`, `pnpm nx typecheck web` all pass.
- [ ] No file outside `apps/web/src/` is modified.
- [ ] Imports from `libs/sim` use `@cgol-scaffold/sim` only.
- [ ] Sprint-status will be updated by the orchestrator.

---

## Out of scope

- Density UI (slider or number input) — explicitly deferred. Locked default 0.3.
- Confirmation dialogs before Clear or Randomize — out of PRD scope.
- Speed slider — Story 3.5.
- Pattern selector (FR13, "Glider" / "Gosper gun" buttons) — Stretch Story 5.2.
- Saved patterns Save/Load UI — Stretch Story 7.3.
- Undo/Redo for Clear or Randomize — out of PRD scope.

---

## Files expected to be created or modified

| File | Action |
| --- | --- |
| `apps/web/src/app/state/simulation-state.ts` | modified — fill `'clear'` and `'randomize'` reducer cases |
| `apps/web/src/app/state/simulation-state.spec.ts` | modified — add tests for `'clear'` and `'randomize'` |
| `apps/web/src/components/Controls.tsx` | modified — add Clear and Randomize buttons |
| `apps/web/src/components/Controls.module.css` | modified — minor styling consistency |
| `apps/web/src/components/Controls.spec.tsx` | modified — add tests for the two new buttons + Tab-order regression |
| `apps/web/src/app/page.tsx` | modified — wire `onClear` and `onRandomize` dispatch handlers |
| `apps/web/src/app/page.spec.tsx` | modified — integration tests for Clear and Randomize while running |
| `apps/web/src/app/constants.ts` | modified — export `DEFAULT_DENSITY = 0.3` (if not yet present from Story 3.1) |

No file outside `apps/web/src/` is modified.

---

## References

- `docs/planning-artifacts/epics.md` — Story 3.4 ACs (mirrored verbatim)
- `docs/planning-artifacts/architecture.md` §5.1 (`randomizeGrid` signature with default density 0.3 and injectable rng), §4.5 (single reducer; no external store)
- `docs/planning-artifacts/prd.md` FR3 (Clear), FR4 (Randomize at ~0.3 density)
- `docs/project-context.md` rules #4 (sim purity; `Math.random` allowed only in `randomizeGrid`'s rng default), #11 (`randomizeGrid(grid, density?, rng?)`), #17 (locked default density 0.3)
- `docs/implementation-artifacts/2-4-randomize-with-injectable-rng-and-tests.md` — Story 2.4 locked the `randomizeGrid` signature this story consumes; "Cross-story coordination" note in 2.4 explicitly identifies this story as the consumer
- `docs/implementation-artifacts/3-3-play-pause-step-controls-and-generation-counter.md` — Controls.tsx (extended here) and the rAF loop hook (which auto-cancels when `running=false`, so Clear/Randomize need only flip the flag)
- `libs/sim/src/index.ts` — `clearGrid`, `randomizeGrid` consumed here
