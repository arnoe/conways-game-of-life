---
story_id: 3.3
epic: 3
title: Play/Pause/Step controls and generation counter
status: ready-for-dev
priority: MVP
estimated_effort: M
fr_nfr_coverage: [FR5, FR6, FR7, FR9]
inputDocuments:
  - docs/planning-artifacts/epics.md
  - docs/planning-artifacts/architecture.md
  - docs/planning-artifacts/prd.md
  - docs/project-context.md
---

# Story 3.3 — Play/Pause/Step controls and generation counter

**Status:** `ready-for-dev`
**Epic:** 3 — Web app interactive MVP
**Priority:** MVP
**Effort:** M

---

## User story

**As** Casey,
**I want** Play, Pause, and Step buttons plus a visible generation counter,
**So that** I can run the simulation, freeze it, advance one step at a time, and see how far it has progressed.

---

## Acceptance criteria

Copied verbatim from `docs/planning-artifacts/epics.md` Story 3.3, with stable IDs added.

- **AC-1** — **Given** the simulation is paused, **when** the user activates Play, **then** generations begin advancing at the currently configured `genPerSec`, the Play control becomes Pause (or is visually toggled), and the gen counter increments by 1 per advanced generation.

- **AC-2** — **Given** the simulation is running, **when** the user activates Pause, **then** advancement stops within one tick, the grid and gen counter are preserved exactly as of the last completed tick, and the control returns to Play.

- **AC-3** — **Given** the simulation is paused, **when** the user activates Step, **then** the grid advances by exactly one generation per `step()` from `libs/sim` and the gen counter increments by 1.

- **AC-4** — **Given** the simulation is running, **when** the user activates Step, **then** the action is a no-op (or is visually disabled), per FR7.

- **AC-5** — **Given** the gen counter is rendered, **when** the page is at any supported viewport, **then** the counter is visible without scrolling and updates within one frame of each generation advance.

---

## Locked technical decisions

These are decisions Dev does **not** need to relitigate.

### `useSimulationLoop` custom hook (architecture §5.2, locked)

The rAF + accumulator loop **lives in a custom hook**, not inline in `page.tsx`. Story 3.5 refines the hook's accumulator logic and exposes the `genPerSec` ref; Story 3.3 ships the **first version** of the hook that uses a fixed cadence so the gen counter can demo before the slider lands.

**Story 3.3's first-version hook signature (locked):**

```typescript
// apps/web/src/hooks/useSimulationLoop.ts
export interface UseSimulationLoopOptions {
  running: boolean;
  genPerSec: number;        // Story 3.3 reads this once per useEffect; Story 3.5 makes it ref-fresh
  onTick: () => void;       // dispatches { type: 'tick' } in the page reducer
}

export function useSimulationLoop(opts: UseSimulationLoopOptions): void;
```

**Story 3.3's implementation strategy:** the hook reads `genPerSec` from a `useRef` already (see code below). This means **Story 3.5 does NOT need to refactor the hook shape**; Story 3.5 only needs to verify the ref-based read survives mid-run slider changes and add the integration test. **Story 3.3 ships the architecturally-correct rAF + accumulator + ref pattern** — the alternative ("just call `step` every frame and let Story 3.5 fix it") would be backwards work that violates Hard Rule §6 of project-context.

> **SM resolution on hook scoping.** The user-task brief allowed Story 3.3 to "tick every frame, with Story 3.5 making it rate-aware." That is incorrect — it would mean Story 3.3 ships code that fails project-context rule #6 (rAF + accumulator with rate read via `useRef`). Story 3.3 ships the full pattern from architecture §5.2; Story 3.5 only adds the slider UI, the `setGenPerSec` action, and the integration test that proves the loop is not torn down on rate change. This sequencing also keeps the gen counter accurate from day one (10 gen/sec by default, not 60).

### Reducer additions (Story 3.3 fills `'play'`, `'pause'`, `'tick'`, `'step'`)

```typescript
// add to apps/web/src/app/state/simulation-state.ts
import { step } from '@cgol-scaffold/sim';

// in simulationReducer:
case 'play':
  return state.running ? state : { ...state, running: true };
case 'pause':
  return state.running ? { ...state, running: false } : state;
case 'tick':
  // Triggered by the rAF loop; only valid when running
  if (!state.running) return state;
  return { ...state, grid: step(state.grid), genCount: state.genCount + 1 };
case 'step':
  // Manual one-step advance; only valid when paused
  if (state.running) return state;
  return { ...state, grid: step(state.grid), genCount: state.genCount + 1 };
```

The atomic `tick` action is exactly why the locked state shape (Story 3.1) puts `grid` and `genCount` in the same reducer — they advance together or not at all. **Do not** split them into two `useState`s.

### Controls component (locked)

Three real `<button>` elements in a single `Controls.tsx` component:

- **Play/Pause button** — single button whose label flips. When `running === false`, label is "Play"; when `running === true`, label is "Pause". `aria-pressed={running}` for screen readers. Use `<button type="button">`.
- **Step button** — `<button type="button">Step</button>`. **Disabled when `running === true`** (`disabled={running}` plus `aria-disabled={running}`). Disabled state must be visually distinct (CSS `:disabled { opacity: 0.5; cursor: not-allowed; }`).
- **Generation counter** — a `<span data-testid="gen-count" aria-live="polite">{genCount}</span>` accompanied by a visible label "Generation: ". `aria-live="polite"` so screen readers announce changes without interrupting other speech.

**Layout:** controls in a horizontal row on desktop, stacked vertically on mobile (CSS Module media query, consistent with Story 3.1's responsive shell).

### File layout

```
apps/web/src/
  app/
    page.tsx                              # MODIFIED — wire useSimulationLoop, dispatch, render Controls
    state/
      simulation-state.ts                 # MODIFIED — fill play/pause/tick/step cases
      simulation-state.spec.ts            # MODIFIED — add tests for the new cases
  components/
    Controls.tsx                          # NEW — Play/Pause, Step, gen counter
    Controls.module.css                   # NEW
    Controls.spec.tsx                     # NEW — RTL tests
  hooks/
    useSimulationLoop.ts                  # NEW — rAF + accumulator + ref-fresh genPerSec
    useSimulationLoop.spec.ts             # NEW — Jest fake timers + rAF stub
```

### `requestAnimationFrame` mocking (Jest)

Use **`jest.useFakeTimers()`** with the `legacyFakeTimers` option set to `false` (modern fake timers). Modern fake timers DO mock `requestAnimationFrame` and `cancelAnimationFrame` since Jest 27. **No additional package needed.**

```typescript
// apps/web/src/hooks/useSimulationLoop.spec.ts
beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

// To advance "frames":
jest.advanceTimersByTime(16); // ~one frame at 60fps
```

Modern fake timers also mock `performance.now()` consistently with `jest.advanceTimersByTime`, which is exactly what the rAF accumulator relies on. **Do not** use `requestAnimationFrame` polyfill packages; modern fake timers cover this.

---

## Test plan

### `apps/web/src/app/state/simulation-state.spec.ts` — additions for Story 3.3

`describe('simulationReducer — play/pause (Story 3.3)')`
- `it('AC-1: dispatching play when running=false sets running=true')`.
- `it('dispatching play when already running returns state unchanged (no-op)')` — defense.
- `it('AC-2: dispatching pause when running=true sets running=false')`.
- `it('dispatching pause when already paused returns state unchanged')`.
- `it('AC-2: pausing preserves grid and genCount exactly')` — snapshot grid + genCount before and after pause; assert reference-equal grid (no allocation), same genCount.

`describe('simulationReducer — tick (Story 3.3)')`
- `it('AC-1: dispatching tick when running advances grid via step() and increments genCount')` — set up a known grid (e.g., a horizontal blinker), dispatch tick, assert grid matches expected next state and genCount === 1.
- `it('dispatching tick when paused returns state unchanged (defense; rAF loop should not fire)')`.
- `it('tick allocates a new Grid (no input mutation)')` — reference-distinct.

`describe('simulationReducer — step (Story 3.3)')`
- `it('AC-3: dispatching step when paused advances grid by exactly one generation and increments genCount by 1')`.
- `it('AC-4: dispatching step when running returns state unchanged')` — covers AC-4 reducer-level branch.
- `it('step on a 3-cell horizontal blinker produces a vertical blinker')` — sanity-check `libs/sim` integration through the reducer; verifies the reducer truly calls `step()` from `libs/sim`.

### `apps/web/src/components/Controls.spec.tsx` — component tests

`describe('Controls — render')`
- `it('renders Play, Step, and gen counter when running=false')` — `screen.getByRole('button', { name: /play/i })`, `screen.getByRole('button', { name: /step/i })`, `screen.getByText(/generation/i)`.
- `it('renders Pause (instead of Play) when running=true')` — `screen.getByRole('button', { name: /pause/i })`; Play button is NOT in the document.
- `it('AC-5: gen counter shows the current genCount')` — pass `genCount={42}`, assert the value is rendered.
- `it('gen counter has data-testid="gen-count"')` — Story 4.1's Playwright spec relies on this selector.
- `it('gen counter has aria-live="polite"')` — accessible counter announcements.

`describe('Controls — interactions')`
- `it('AC-1: clicking Play calls onPlay')` — `userEvent.click(playBtn)`; assert mock.
- `it('AC-2: clicking Pause calls onPause')`.
- `it('AC-3: clicking Step (when running=false) calls onStep')`.
- `it('AC-4: Step button is disabled when running=true')` — `expect(stepBtn).toBeDisabled()`. Clicking a disabled button does NOT call `onStep` (RTL/userEvent honors disabled).
- `it('Play/Pause button has aria-pressed reflecting running state')`.

`describe('Controls — accessibility baseline (Story 4.2 audit precursor)')`
- `it('all three buttons have accessible names')` — `getByRole('button', ...)` finds each.
- `it('all three buttons are keyboard-focusable in document order: Play/Pause, Step')`.

### `apps/web/src/hooks/useSimulationLoop.spec.ts` — hook tests

`describe('useSimulationLoop — running=false')`
- `it('does not call onTick when running=false')` — render hook with `running=false`, advance 1000ms, assert `onTick` was never called.

`describe('useSimulationLoop — running=true at 10 gen/sec')`
- `it('calls onTick approximately 10 times per 1000ms')` — render hook with `running=true, genPerSec=10`, advance 1000ms via `jest.advanceTimersByTime(1000)`, assert `onTick.mock.calls.length` is between 9 and 11 (tolerance for accumulator drift). The cadence target is `1000/10 = 100ms` per tick.
- `it('AC-1: ticks fire at the configured cadence — 5 ticks in 500ms at 10 gen/sec')`.

`describe('useSimulationLoop — pause behavior (AC-2)')`
- `it('AC-2: stopping (running=false) cancels rAF and onTick is not called subsequently')` — start, advance, rerender with `running=false`, advance more, assert no further onTick calls.

`describe('useSimulationLoop — Story 3.5 hand-off')`
- `it('reads genPerSec via a ref, not a closure (regression guard for Story 3.5)')` — start at 10 gen/sec, then rerender the hook with genPerSec=30 *without* changing running; advance time; assert the cadence corresponds to 30 gen/sec for the second half. **This test exists in Story 3.3 to lock the architecture pattern in place** and will be re-asserted in Story 3.5's tests.

### `apps/web/src/app/page.spec.tsx` — integration additions for Story 3.3

`describe('page (Story 3.3) — Play/Pause integration')`
- `it('AC-1: clicking Play sets running=true; mock advance time → genCount increases')` — full integration with `jest.useFakeTimers()`. Render page, click Play, advance 200ms (at 10 gen/sec → 2 ticks), assert `data-testid="gen-count"` shows `2`.
- `it('AC-2: clicking Pause stops genCount from increasing')` — start running, advance, click Pause, advance more, assert genCount unchanged after pause.
- `it('AC-3: clicking Step when paused increments genCount by 1')`.
- `it('AC-4: Step button disabled while running')`.
- `it('Story 3.1 cross-check (AC-5 from Story 3.1): submitting GridSizeForm while running pauses and clears')` — start running, submit a new size via the form, assert running=false and genCount=0. **This is the deferred-from-Story-3.1 verification.**

---

## Dev notes

### Hard rules (Epic 3-wide)

- **TypeScript strict, no `any`, no `@ts-ignore`.**
- **No external state libs.**
- **rAF + accumulator with `genPerSec` read through a `useRef`** — see hook implementation below. Project-context rule #6.
- **`setInterval` is forbidden for the run loop** — project-context rule #7.
- **All `<button>` elements have accessible names** (visible text suffices for Play/Pause/Step; do not over-decorate with `aria-label`).
- **`@cgol-scaffold/sim` imports only.** This story uses `step` (already exported).

### Cross-story coordination

- **Builds on Stories 3.1 and 3.2.** Story 3.1's reducer is extended (cases for play/pause/tick/step filled). Story 3.2's `<Canvas>` reads `state.running` — that prop becomes meaningful in Story 3.3.
- **Story 3.3 also closes Story 3.1's deferred AC-5** (submitting the resize form while running pauses + clears). Add the integration test to `page.spec.tsx` per the test plan.
- **Story 3.4 will add `'clear'` and `'randomize'` reducer cases** that BOTH set `running=false` and `genCount=0`. The hook's `running=false` cancellation already handles loop teardown — Story 3.4 doesn't need to touch the hook.
- **Story 3.5 will add a `'setGenPerSec'` action and a `<SpeedSlider>` component.** The `useSimulationLoop` hook's ref-based `genPerSec` read is locked here so Story 3.5 only needs to add the slider UI and the integration test that proves no loop teardown on rate change.

### Algorithmic guidance — `useSimulationLoop` (locked-in-shape per architecture §5.2)

```typescript
import { useEffect, useRef } from 'react';

export interface UseSimulationLoopOptions {
  running: boolean;
  genPerSec: number;
  onTick: () => void;
}

export function useSimulationLoop({ running, genPerSec, onTick }: UseSimulationLoopOptions): void {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);
  const genPerSecRef = useRef<number>(genPerSec);
  const onTickRef = useRef<() => void>(onTick);

  // Always-fresh refs — no closure capture of the rate or callback
  genPerSecRef.current = genPerSec;
  onTickRef.current = onTick;

  useEffect(() => {
    if (!running) return;

    lastTimeRef.current = performance.now();
    accumulatorRef.current = 0;

    const tick = (now: number) => {
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;
      accumulatorRef.current += dt;
      const interval = 1000 / Math.max(1, genPerSecRef.current);
      while (accumulatorRef.current >= interval) {
        onTickRef.current();
        accumulatorRef.current -= interval;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [running]); // <— ONLY `running` is a dep. Not genPerSec, not onTick.
}
```

**Critical pitfall to avoid (project-context rule #6, R7 in architecture §9):**

If `genPerSec` is added to the `useEffect` deps array, every slider tick (Story 3.5) tears down the rAF loop and rebuilds it. The visible result: a stutter or pause every time the slider moves. The fix is the ref-based read, locked above. The Story 3.5 integration test asserts the loop is NOT torn down on `genPerSec` change.

The `onTick` callback is also routed through a ref so the page-level dispatch reference doesn't trigger teardown if React decides to give us a fresh `dispatch` (it won't — `dispatch` from `useReducer` is stable — but the ref pattern is a defense against any future refactor that wraps dispatch in a memoized callback).

### What NOT to do here

- **Do not** put `genPerSec` in the `useEffect` deps array. Use the ref pattern above.
- **Do not** use `setInterval(onTick, 1000/genPerSec)`. Project-context rule #7.
- **Do not** split `tick` into two reducer dispatches (one for grid, one for genCount). One atomic `tick` action; Story 3.1's reducer shape demands it.
- **Do not** track running state via a `useRef` on the page — it lives in reducer state. Project-context rule #32 + Story 3.1 lock.
- **Do not** show a debugging "FPS" counter in the UI. Out of scope for MVP.
- **Do not** re-implement the rAF loop inside `<Canvas>`. The Canvas re-renders on grid change via its `useEffect([grid])` (Story 3.2). The hook drives `dispatch({type:'tick'})` → new grid → Canvas re-renders. That is the locked architecture.

---

## Definition of done

- [ ] `apps/web/src/hooks/useSimulationLoop.ts` exists with the ref-based rAF + accumulator pattern.
- [ ] `apps/web/src/hooks/useSimulationLoop.spec.ts` exists with all hook tests above; uses Jest modern fake timers.
- [ ] `apps/web/src/components/Controls.tsx` exists with Play/Pause, Step, and gen counter per the locked shape.
- [ ] `apps/web/src/components/Controls.spec.tsx` exists with all RTL tests above; passes.
- [ ] `apps/web/src/app/state/simulation-state.ts` `'play'`, `'pause'`, `'tick'`, `'step'` reducer cases are filled.
- [ ] `apps/web/src/app/state/simulation-state.spec.ts` covers all four new cases.
- [ ] `apps/web/src/app/page.tsx` invokes `useSimulationLoop({ running: state.running, genPerSec: state.genPerSec, onTick: () => dispatch({ type: 'tick' }) })` and renders `<Controls>`.
- [ ] Page-level integration test (`page.spec.tsx`) passes with all Story 3.3 cases plus the deferred AC-5 from Story 3.1.
- [ ] Step button is keyboard-focusable, has accessible name, is disabled when running.
- [ ] Play/Pause button has `aria-pressed` reflecting state.
- [ ] Gen counter has `aria-live="polite"` and `data-testid="gen-count"` (Story 4.1 selector).
- [ ] `pnpm nx lint web`, `pnpm nx test web`, `pnpm nx typecheck web` all pass.
- [ ] No file outside `apps/web/src/` is modified.
- [ ] Sprint-status will be updated by the orchestrator.

---

## Out of scope

- Speed slider — Story 3.5.
- Clear and Randomize controls — Story 3.4.
- Keyboard a11y full audit (Tab order across all controls, axe-core check) — Story 4.2.
- Playwright happy-path E2E (which uses this story's `data-testid="gen-count"`) — Story 4.1.
- Performance profiling against NFR4 budget — measured in Story 4.4 (README write-up).
- Pause-on-window-blur — out of MVP scope.

---

## Files expected to be created or modified

| File | Action |
| --- | --- |
| `apps/web/src/hooks/useSimulationLoop.ts` | created |
| `apps/web/src/hooks/useSimulationLoop.spec.ts` | created |
| `apps/web/src/components/Controls.tsx` | created |
| `apps/web/src/components/Controls.module.css` | created |
| `apps/web/src/components/Controls.spec.tsx` | created |
| `apps/web/src/app/state/simulation-state.ts` | modified — fill play/pause/tick/step cases |
| `apps/web/src/app/state/simulation-state.spec.ts` | modified — add tests for the new cases |
| `apps/web/src/app/page.tsx` | modified — wire `useSimulationLoop` and render `<Controls>` |
| `apps/web/src/app/page.spec.tsx` | modified — integration tests for Play/Pause/Step + Story 3.1 AC-5 closure |

No file outside `apps/web/src/` is modified.

---

## References

- `docs/planning-artifacts/epics.md` — Story 3.3 ACs (mirrored verbatim)
- `docs/planning-artifacts/architecture.md` §5.2 (rAF + accumulator pattern with ref-fresh `genPerSec` read — pseudocode is the authoritative reference for `useSimulationLoop`)
- `docs/planning-artifacts/prd.md` FR5/FR6/FR7 (Play/Pause/Step), FR9 (gen counter visible at all times)
- `docs/project-context.md` rules #6 (rAF + accumulator with ref-fresh rate; never put `genPerSec` in deps), #7 (`setInterval` forbidden), #9 (`step` is pure; one new `Uint8Array` per call)
- `docs/implementation-artifacts/3-1-page-shell-canvas-size-form-and-responsive-layout.md` — reducer skeleton + deferred AC-5
- `docs/implementation-artifacts/3-2-canvas-render-and-click-tap-to-toggle-cells.md` — Canvas reads `state.running`; Play/Pause flips it
- `libs/sim/src/index.ts` — `step` consumed here
