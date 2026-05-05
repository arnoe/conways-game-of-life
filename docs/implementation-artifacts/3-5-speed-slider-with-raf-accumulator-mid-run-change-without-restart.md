---
story_id: 3.5
epic: 3
title: Speed slider with rAF + accumulator (mid-run change without restart)
status: ready-for-dev
priority: MVP
estimated_effort: M
fr_nfr_coverage: [FR8, NFR4]
inputDocuments:
  - docs/planning-artifacts/epics.md
  - docs/planning-artifacts/architecture.md
  - docs/planning-artifacts/prd.md
  - docs/project-context.md
---

# Story 3.5 — Speed slider with rAF + accumulator (mid-run change without restart)

**Status:** `ready-for-dev`
**Epic:** 3 — Web app interactive MVP
**Priority:** MVP
**Effort:** M

---

## User story

**As** Casey,
**I want** to drag the generations-per-second slider while the simulation is running and have the new rate take effect on the next tick,
**So that** I never have to pause and resume just to change speed.

---

## Acceptance criteria

Copied verbatim from `docs/planning-artifacts/epics.md` Story 3.5, with stable IDs added.

- **AC-1** — **Given** the simulation loop is implemented as a `useSimulationLoop` hook driven by `requestAnimationFrame` plus a time accumulator per architecture §5.2, **when** `genPerSec` changes, **then** the change is read fresh each frame via a `useRef` (not via a `useEffect` dependency), so the rAF loop is not torn down and rebuilt.

- **AC-2** — **Given** the slider is rendered with documented bounds (1–60 gen/sec, default 10), **when** the user drags from one rate to another while the simulation is running, **then** the next advanced generation occurs at the new rate without any visible pause, restart, or counter discontinuity.

- **AC-3** — **Given** an integration test in `apps/web`, **when** the user changes the slider mid-run, **then** the loop's underlying `useEffect` does not re-run (verified by hook-render assertions or a render-counter ref) and the simulation continues uninterrupted.

- **AC-4** — **Given** the slider is keyboard-focused, **when** the user presses Arrow Left or Arrow Right, **then** the rate changes by one gen/sec per keypress (FR12 hookup).

---

## Locked technical decisions

These are decisions Dev does **not** need to relitigate.

### Rate unit and bounds (architecture §5.2 + project-context rule #17, locked)

- **Unit: ticks per second (gen/sec).** NOT ms-per-tick. The slider's `value` attribute is `genPerSec`. The hook computes `interval = 1000 / genPerSec` internally.
- **Range: 1–60.** Slider `min=1`, `max=60`, `step=1`.
- **Default: 10.** Story 3.1's `INITIAL_STATE.genPerSec` is 10.

> **SM resolution on unit choice.** The user-task brief allowed either "ticks per second" or "ms per tick." The locked answer is **gen/sec** because (a) the PRD says "Adjust simulation speed" framed in user terms (faster = higher number, intuitive), (b) architecture §5.2's pseudocode uses `genPerSec`, (c) project-context rule #17 lists "Speed slider range: 1–60 gen/sec, default 10" — the unit is settled. Don't relitigate.

### Closure pitfall — the entire reason this story exists (project-context rule #6, R7 in architecture §9)

The naive implementation of a rate-aware rAF loop captures `genPerSec` in the `useEffect` dependency array:

```typescript
// WRONG — do not do this
useEffect(() => {
  if (!running) return;
  const tick = (now: number) => {
    /* ... uses genPerSec from closure ... */
  };
  const id = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(id);
}, [running, genPerSec]); // <-- WRONG: rate change tears down + rebuilds the loop
```

The user drags the slider. `genPerSec` changes from 10 → 15. React reruns the effect: the `cancelAnimationFrame` cleanup fires, then the new effect kicks off a new rAF chain. The visible result: a one-frame stutter or "restart" each time the slider moves. This is **PRD R7 verbatim** ("speed slider needs restart") and is the precise pathology Story 3.5 must defeat.

**The fix (locked in Story 3.3 already, re-verified here):**

```typescript
// CORRECT — Story 3.3 shipped this; Story 3.5 verifies it survives slider use
const genPerSecRef = useRef(genPerSec);
genPerSecRef.current = genPerSec; // re-synced every render, but not via useEffect

useEffect(() => {
  if (!running) return;
  const tick = (now: number) => {
    /* ... reads genPerSecRef.current — always fresh ... */
  };
  const id = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(id);
}, [running]); // <-- only `running` triggers loop teardown
```

The `genPerSecRef.current = genPerSec` assignment runs synchronously during render (top of the hook, before the `useEffect`). Each render produces a fresh `current` value. The rAF callback closes over the *ref* (a stable identity), and dereferences `.current` each frame. **The closure pitfall is structurally impossible** because the callback never closes over the value of `genPerSec` — only over the ref, whose `current` is mutable.

> **Why not `useLayoutEffect` resync?** A `useLayoutEffect(() => { genPerSecRef.current = genPerSec; })` would also work, but the bare assignment at top-of-render is simpler, avoids one effect call per render, and is the canonical "ref shadow" pattern in React. Architecture §5.2's pseudocode uses the bare-assignment form. **Do that.**

### Reducer addition (Story 3.5 fills `'setGenPerSec'`)

```typescript
// add to apps/web/src/app/state/simulation-state.ts
import { MIN_GEN_PER_SEC, MAX_GEN_PER_SEC } from '../constants.js'; // 1, 60

// in simulationReducer:
case 'setGenPerSec': {
  if (typeof action.genPerSec !== 'number' || !Number.isFinite(action.genPerSec)) return state;
  const clamped = Math.max(MIN_GEN_PER_SEC, Math.min(MAX_GEN_PER_SEC, Math.round(action.genPerSec)));
  return { ...state, genPerSec: clamped };
}
```

Notes:
- Clamping is defense-in-depth; the slider's `min`/`max` attributes already constrain the user.
- `Math.round` snaps to integer — the slider step is 1, but if any caller passes a fractional value, integer-snap keeps the cadence math clean.
- The reducer does NOT touch `running`, `grid`, or `genCount`. Speed change is rate-only, not state-disrupting.

### `<SpeedSlider>` component (locked)

```
┌─ SpeedSlider ───────────────────────────────┐
│  Speed: 10 gen/sec                          │
│  [─────●──────────────────────] 1 ↔ 60      │
└─────────────────────────────────────────────┘
```

- A `<label>` with text "Speed:" plus the live numeric value (e.g., "10 gen/sec").
- `<input type="range" min="1" max="60" step="1" value={genPerSec} aria-label="Simulation speed in generations per second" aria-valuemin={1} aria-valuemax={60} aria-valuenow={genPerSec}>`.
- The component does NOT manage internal state — `genPerSec` comes in via prop, `onChange` calls back to the page.
- Tab order: after Randomize button (locked in Story 3.4's regression test).

### File layout

```
apps/web/src/
  app/
    page.tsx                              # MODIFIED — render <SpeedSlider> and wire dispatch
    state/
      simulation-state.ts                 # MODIFIED — fill 'setGenPerSec' reducer case
      simulation-state.spec.ts            # MODIFIED — add tests for 'setGenPerSec'
    constants.ts                          # MODIFIED — export MIN_GEN_PER_SEC=1, MAX_GEN_PER_SEC=60
  components/
    SpeedSlider.tsx                       # NEW
    SpeedSlider.module.css                # NEW
    SpeedSlider.spec.tsx                  # NEW
  hooks/
    useSimulationLoop.ts                  # NO CHANGES — Story 3.3 already shipped the ref pattern
    useSimulationLoop.spec.ts             # MODIFIED — add slider-survival regression test
```

**Critical:** `useSimulationLoop.ts` itself is **NOT modified in Story 3.5**. Story 3.3 shipped the ref-based pattern in full; Story 3.5 only adds the slider UI, the reducer case, and the integration test that proves the loop survives mid-run rate changes.

---

## Test plan

### `apps/web/src/app/state/simulation-state.spec.ts` — additions for Story 3.5

`describe('simulationReducer — setGenPerSec (Story 3.5)')`
- `it('AC-2: dispatching setGenPerSec with 30 sets state.genPerSec to 30')`.
- `it('clamps values below 1 to 1')` — pass 0; assert genPerSec = 1.
- `it('clamps values above 60 to 60')` — pass 99; assert genPerSec = 60.
- `it('rounds non-integer values to nearest integer')` — pass 12.7; assert genPerSec = 13.
- `it('rejects NaN and Infinity (returns state unchanged)')`.
- `it('does NOT modify running, grid, or genCount')` — start with running=true, genCount=5, paint a few cells; dispatch setGenPerSec; assert all three are unchanged.

### `apps/web/src/components/SpeedSlider.spec.tsx` — component tests

`describe('SpeedSlider — render')`
- `it('renders an input[type=range] with min=1, max=60, step=1, value={genPerSec prop}')`.
- `it('renders an accessible label "Simulation speed in generations per second"')`.
- `it('displays the current numeric value visibly (e.g., "10 gen/sec")')`.
- `it('has aria-valuemin=1, aria-valuemax=60, aria-valuenow={genPerSec}')`.

`describe('SpeedSlider — interactions')`
- `it('AC-2: changing the slider value via fireEvent.change calls onChange(newValue)')` — `fireEvent.change(slider, { target: { value: '30' } })`; assert mock called with `30` (number, not string).
- `it('AC-4: ArrowRight increments the slider value by 1 (browser-native, but verified)')` — focus slider, `userEvent.keyboard('{ArrowRight}')`. Note: in jsdom, native arrow-key increment on `<input type="range">` may not fire a `change` event. **Test strategy:** assert `aria-valuenow` is increased (rendered from prop), AND assert that calling `fireEvent.keyDown` followed by manual `onChange` simulates the browser path. If jsdom doesn't simulate the browser's range-input arrow-key behavior, **document the limitation in the spec comment** and rely on Story 4.2 (Playwright keyboard test) for the full keyboard-arrow verification.
- `it('AC-4: ArrowLeft decrements the slider value by 1')` — same approach.

`describe('SpeedSlider — accessibility baseline')`
- `it('slider is keyboard-focusable (Tab reaches it)')`.
- `it('slider has a visible focus indicator (CSS :focus-visible — verify class application or computed style)')`.

### `apps/web/src/hooks/useSimulationLoop.spec.ts` — additions for Story 3.5

`describe('useSimulationLoop — mid-run rate change (Story 3.5 — AC-1, AC-3)')`
- `it('AC-3: rerendering with a new genPerSec does NOT cause the useEffect cleanup to fire')` — render hook with `running=true, genPerSec=10`. Rerender with `running=true, genPerSec=30`. Assert `cancelAnimationFrame` was NOT called between renders. Strategy: spy on `cancelAnimationFrame` (jest fake-timers expose it) or verify by inspecting an internal "effect-run-counter" injected via the test's setup (a wrapper component with a `useRef` counter incremented on each effect cleanup).
- `it('AC-1: changing genPerSec from 10 to 30 mid-run changes the tick cadence on the next frame')` — start at 10 gen/sec, advance 500ms (expect ~5 ticks), update genPerSec to 30, advance another 500ms (expect ~15 ticks). Assert total ticks ≈ 5 + 15 = 20 with tolerance ±3.
- `it('AC-2: counter does not skip or reset on slider change')` — simulate the same scenario at the page level (in `page.spec.tsx`), assert genCount is monotonically increasing across the rate change.

`describe('useSimulationLoop — extreme rates')`
- `it('at genPerSec=60, the inner accumulator while-loop runs at most once per frame in normal conditions')` — at 60fps display refresh and 60 ticks/sec, frame cadence equals tick cadence. Verify by advancing time in 16ms increments and asserting tick count.
- `it('at genPerSec=1, ticks fire roughly once per 1000ms')` — wide tolerance.

### `apps/web/src/app/page.spec.tsx` — integration additions for Story 3.5

`describe('page (Story 3.5) — slider integration')`
- `it('AC-2 + AC-3: starting the sim, dragging slider mid-run, asserting genCount keeps increasing without discontinuity')` — full integration: click Play, advance time, change slider via `fireEvent.change`, advance more, assert gen-count's text changes monotonically and the canvas keeps re-rendering (recorded fillRect call counts).
- `it('AC-1: changing slider does not cancel-and-restart the rAF loop (regression for R7)')` — same scenario, with a spy on `cancelAnimationFrame`. Assert it's called only when the user clicks Pause (or the test ends), NOT when the slider changes.

---

## Dev notes

### Hard rules (Epic 3-wide)

- **TypeScript strict, no `any`, no `@ts-ignore`.**
- **No external state libs.**
- **rAF + accumulator with `genPerSec` read through a `useRef`** — already shipped in Story 3.3, **DO NOT modify the hook in this story** beyond adding tests. Project-context rule #6.
- **`setInterval` is forbidden.** Project-context rule #7.
- **Accessible names:** the slider's `aria-label` is "Simulation speed in generations per second."
- **`@cgol-scaffold/sim` imports only.** This story does NOT import from `libs/sim` directly — it only adds a UI control and a reducer case.

### The closure pitfall — full explanation (cite this in code review)

The reason refs work and `useEffect` deps don't:

1. **`useEffect`'s lifecycle is dep-array-driven.** Add `genPerSec` to the deps, and React tears down the effect (running its cleanup, which calls `cancelAnimationFrame`) and runs the effect anew (which calls `requestAnimationFrame`) on every value change. For a slider that changes 30 times during a single drag, that's 30 teardown/setup cycles. The visible result: jitter.

2. **A closure-captured `genPerSec` (without deps) is stale.** If you remove `genPerSec` from the deps to avoid teardown, the `tick` callback closes over the original value of `genPerSec` from the render where the effect was first set up. Subsequent renders don't change the closure. The slider does nothing.

3. **A `useRef` shadow lets the callback read fresh values without re-binding.** The ref's identity is stable across renders; its `.current` is mutable. The render-time assignment `genPerSecRef.current = genPerSec` keeps the ref synced. The rAF callback dereferences `.current` each frame and reads the latest value. No teardown, no staleness. **This is the architecture's load-bearing pattern.**

If a reviewer asks "why not just use `useState` for the rate inside the loop?" the answer is: state changes trigger renders, and the rAF callback's dep-array would still need to capture the rate somehow. The ref pattern is the only one that decouples "rate value" from "render lifecycle."

### Cross-story coordination

- **Builds on Stories 3.1, 3.2, 3.3, 3.4.** This is the LAST Epic 3 story. After it lands, the MVP web app is complete and Epic 4 (E2E + a11y polish) begins.
- **Story 3.3's `useSimulationLoop` is not modified** — only its test file is extended with the mid-run-rate-change regression test.
- **Story 4.2** will run an axe-core audit on the entire page including the slider; the slider's a11y attributes (`aria-label`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`) should clear axe-core out of the box.
- **Story 4.1** (Playwright happy-path) does not interact with the slider — it uses the default 10 gen/sec.

### Algorithmic guidance — SpeedSlider.tsx (locked-in-shape)

```tsx
'use client';

import { MIN_GEN_PER_SEC, MAX_GEN_PER_SEC } from '../app/constants.js';
import styles from './SpeedSlider.module.css';

interface SpeedSliderProps {
  genPerSec: number;
  onChange: (next: number) => void;
}

export function SpeedSlider({ genPerSec, onChange }: SpeedSliderProps) {
  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>
        <span>Speed: {genPerSec} gen/sec</span>
        <input
          type="range"
          min={MIN_GEN_PER_SEC}
          max={MAX_GEN_PER_SEC}
          step={1}
          value={genPerSec}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Simulation speed in generations per second"
          aria-valuemin={MIN_GEN_PER_SEC}
          aria-valuemax={MAX_GEN_PER_SEC}
          aria-valuenow={genPerSec}
        />
      </label>
    </div>
  );
}
```

### What NOT to do here

- **Do not** refactor `useSimulationLoop.ts`. Story 3.3 shipped the ref pattern in full. Story 3.5 only adds tests for the survival of that pattern.
- **Do not** add `genPerSec` to the `useEffect` deps array of `useSimulationLoop`. This is the precise R7 regression. Code review must reject it on sight.
- **Do not** debounce the slider's `onChange`. The `setGenPerSec` reducer is cheap; the rAF loop reads the new rate on the next frame regardless of how fast the slider fires `change` events. Debouncing would *introduce* the lag that AC-2 says must not exist.
- **Do not** wrap the slider in a controlled-uncontrolled hybrid. It's controlled: `value={genPerSec}` from props, `onChange` calls back. Period.
- **Do not** add a "play speed" preset (e.g., 1x, 2x, 4x buttons). FR8's slider is the spec; a preset is scope creep.
- **Do not** ms-per-tick the slider. Locked unit is gen/sec.
- **Do not** allow ms-per-tick conversion at the prop level. The page passes `genPerSec` to both `useSimulationLoop` and `<SpeedSlider>` directly.
- **Do not** put a `useState` inside `<SpeedSlider>` to track the local value separately from props. Single source of truth: page reducer state.
- **Do not** use `setInterval` anywhere in this codebase. Period. Project-context rule #7.

---

## Definition of done

- [ ] `apps/web/src/app/state/simulation-state.ts` `'setGenPerSec'` reducer case is filled per the locked shape (with clamping and integer snap).
- [ ] `apps/web/src/app/state/simulation-state.spec.ts` covers the `'setGenPerSec'` case with the listed assertions.
- [ ] `apps/web/src/components/SpeedSlider.tsx` exists and renders `<input type="range">` with the locked attributes (min=1, max=60, step=1, value=prop, aria-label, aria-valuemin/max/now).
- [ ] `apps/web/src/components/SpeedSlider.spec.tsx` covers render, interactions, and a11y baseline.
- [ ] `apps/web/src/hooks/useSimulationLoop.spec.ts` is **extended** (not rewritten) with the mid-run-rate-change regression test that asserts the `useEffect` cleanup does NOT fire on `genPerSec` change.
- [ ] `apps/web/src/app/page.tsx` renders `<SpeedSlider genPerSec={state.genPerSec} onChange={(v) => dispatch({ type: 'setGenPerSec', genPerSec: v })} />`.
- [ ] Page-level integration test (`page.spec.tsx`) covers AC-1, AC-2, AC-3 end-to-end (rate change mid-run, no loop teardown, monotonic genCount).
- [ ] Slider is reachable via Tab in the order: Width, Height, Apply, Play/Pause, Step, Clear, Randomize, **Speed slider**.
- [ ] `apps/web/src/app/constants.ts` exports `MIN_GEN_PER_SEC = 1`, `MAX_GEN_PER_SEC = 60`.
- [ ] `useSimulationLoop.ts` is **NOT modified in this story** (only its test file).
- [ ] `pnpm nx lint web`, `pnpm nx test web`, `pnpm nx typecheck web` all pass.
- [ ] No file outside `apps/web/src/` is modified.
- [ ] Sprint-status will be updated by the orchestrator.

---

## Out of scope

- Pause-on-window-blur — out of MVP scope.
- Speed presets (1x/2x/4x buttons, "Fast Forward" affordance) — out of PRD scope.
- ms-per-tick unit — locked as gen/sec.
- Density slider (FR4 randomization is fixed at 0.3) — Story 3.4 deferred this; out of MVP scope.
- E2E Playwright slider test — Story 4.2 will include keyboard-arrow verification at the E2E layer.
- Re-implementing `useSimulationLoop` — Story 3.3 owns it; Story 3.5 only consumes it.

---

## Files expected to be created or modified

| File | Action |
| --- | --- |
| `apps/web/src/app/state/simulation-state.ts` | modified — fill `'setGenPerSec'` reducer case with clamping |
| `apps/web/src/app/state/simulation-state.spec.ts` | modified — add tests for `'setGenPerSec'` |
| `apps/web/src/components/SpeedSlider.tsx` | created |
| `apps/web/src/components/SpeedSlider.module.css` | created |
| `apps/web/src/components/SpeedSlider.spec.tsx` | created |
| `apps/web/src/hooks/useSimulationLoop.spec.ts` | modified — add mid-run rate-change regression tests (the hook itself is unchanged) |
| `apps/web/src/app/page.tsx` | modified — render `<SpeedSlider>` and wire `setGenPerSec` dispatch |
| `apps/web/src/app/page.spec.tsx` | modified — integration tests for slider survival of the rAF loop |
| `apps/web/src/app/constants.ts` | modified — export `MIN_GEN_PER_SEC = 1`, `MAX_GEN_PER_SEC = 60` |

`apps/web/src/hooks/useSimulationLoop.ts` is **NOT** in this list — Story 3.3 shipped the loop in its final form. Verify before merging that no Dev change-set in this story modifies that file beyond comments.

No file outside `apps/web/src/` is modified.

---

## References

- `docs/planning-artifacts/epics.md` — Story 3.5 ACs (mirrored verbatim)
- `docs/planning-artifacts/architecture.md` §5.2 (rAF + accumulator pseudocode with ref-fresh `genPerSec` — the authoritative reference; this story's locked patterns mirror it exactly), §9 R7 (the precise regression this story prevents)
- `docs/planning-artifacts/prd.md` FR8 (mid-run speed change without restart), FR12 (keyboard-accessible: ArrowLeft/ArrowRight on slider), R7 in PRD §Risks (the seductive `setInterval` shortcut and why it's wrong)
- `docs/project-context.md` rules #6 (rAF + accumulator with ref-fresh rate; never put `genPerSec` in deps), #7 (`setInterval` forbidden), #17 (locked: 1–60 gen/sec, default 10), #20 (path alias for cross-lib imports)
- `docs/implementation-artifacts/3-3-play-pause-step-controls-and-generation-counter.md` — `useSimulationLoop` already ships the ref pattern; this story verifies it survives slider use
- `docs/implementation-artifacts/3-4-clear-and-randomize-controls.md` — Tab-order regression test placement (slider after Randomize)
