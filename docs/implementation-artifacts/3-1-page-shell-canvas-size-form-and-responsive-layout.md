---
story_id: 3.1
epic: 3
title: Page shell, canvas size form, and responsive layout
status: ready-for-dev
priority: MVP
estimated_effort: M
fr_nfr_coverage: [FR1, FR11, NFR1]
inputDocuments:
  - docs/planning-artifacts/epics.md
  - docs/planning-artifacts/architecture.md
  - docs/planning-artifacts/prd.md
  - docs/project-context.md
---

# Story 3.1 — Page shell, canvas size form, and responsive layout

**Status:** `ready-for-dev`
**Epic:** 3 — Web app interactive MVP
**Priority:** MVP
**Effort:** M

---

## User story

**As** Casey,
**I want** to land on a page with a sensible-default empty grid and a width × height form to resize it,
**So that** I can start interacting within seconds on either desktop or my 375px portrait phone.

---

## Acceptance criteria

Copied verbatim from `docs/planning-artifacts/epics.md` Story 3.1, with stable IDs added.

- **AC-1** — **Given** the deployed (or locally running) page is loaded, **when** the user opens it on a desktop ≥1280px viewport, **then** the canvas and all primary controls are visible together with no scrolling.

- **AC-2** — **Given** the page is loaded on a 375px portrait viewport, **when** the page renders, **then** controls reflow vertically, the canvas scales to fit width, and there is no horizontal scrollbar.

- **AC-3** — **Given** the canvas size form, **when** the user enters a valid width and height within `[5, 100]`, **then** the grid renders at the new dimensions and the generation counter resets to 0.

- **AC-4** — **Given** the canvas size form, **when** the user enters a value outside `[5, 100]` (zero, negative, >100, non-numeric), **then** the input is rejected with a visible message and the previous size is retained.

- **AC-5** — **Given** the simulation is running, **when** the user submits a new canvas size, **then** the simulation pauses and the grid resets per the documented choice (architecture §10 Open Question 1 — pause + clear).

> **Story-3.1 scope clarification on AC-5.** Story 3.1 introduces the *form* and the resize handler. The "running" state and the Play/Pause control land in Story 3.3. AC-5 is **partially** verifiable in this story: the resize handler must call into a `pause()` callback and reset the grid + gen counter atomically. Because Play/Pause is not yet wired, this story stubs `running` as `false` and exposes a `pause()` no-op via the page-level reducer; Story 3.3 wires the real Play/Pause to the same reducer. **AC-5 is fully verified end-to-end in Story 3.3's integration test**, not here. Story 3.1's tests verify the resize-while-paused branch and the reducer dispatch shape.

---

## Locked technical decisions

These are decisions Dev does **not** need to relitigate. Defer to architecture.md / project-context.md if anything below appears ambiguous; nothing should.

### State architecture (architecture §4.5, project-context rule #32 of "no external store")

**Single page-level `useReducer` lives in `apps/web/src/app/page.tsx`.** No Context, no Zustand, no Jotai, no Redux. The reducer's state shape (locked once here, consumed verbatim by Stories 3.2–3.5):

```typescript
// apps/web/src/app/state/simulation-state.ts
import type { Grid } from '@cgol-scaffold/sim';

export interface SimulationState {
  grid: Grid;
  running: boolean;       // wired by Story 3.3
  genCount: number;       // wired by Story 3.3
  genPerSec: number;      // wired by Story 3.5; default 10
  dimensions: { width: number; height: number };
}

export type SimulationAction =
  | { type: 'resize'; width: number; height: number }   // Story 3.1
  | { type: 'toggleCell'; x: number; y: number }        // Story 3.2
  | { type: 'play' }                                    // Story 3.3
  | { type: 'pause' }                                   // Story 3.3
  | { type: 'tick' }                                    // Story 3.3 (advances grid + genCount)
  | { type: 'step' }                                    // Story 3.3
  | { type: 'clear' }                                   // Story 3.4
  | { type: 'randomize' }                               // Story 3.4
  | { type: 'setGenPerSec'; genPerSec: number };        // Story 3.5
```

**Story 3.1 implements only `resize`** — and the initial state. The other action types are declared in the union (so the discriminated-union exhaustiveness is locked from day one) but their reducer cases are stubbed as `return state` until their owning story lands. **Do not** delete the unused action variants from the union; that would force Story 3.2+ to widen the type.

**Initial state (locked):**

```typescript
const INITIAL_STATE: SimulationState = {
  grid: createGrid(30, 30),    // project-context rule #17: default 30×30
  running: false,
  genCount: 0,
  genPerSec: 10,               // project-context rule #17: default 10 gen/sec
  dimensions: { width: 30, height: 30 },
};
```

> **Sprint-planning resolution on state shape.** The SM-task guidance asked whether state lives in `useState`, `useReducer`, a hook, or context. **Architecture §4.5 locks the answer: page-level `useReducer`** so that grid + genCount transitions are atomic on each tick. Story 3.1 instantiates the reducer; Stories 3.2–3.5 add cases. No custom hook for the reducer in this story — the `useReducer(simulationReducer, INITIAL_STATE)` call lives directly in `page.tsx`.

### Resize-while-running behavior (architecture §10 Open Question 1, locked: pause + clear)

The `resize` action handler:
1. Validates `5 ≤ width ≤ 100` and `5 ≤ height ≤ 100` (project-context rule #17).
2. If invalid: returns `state` unchanged (the form-level validation prevents dispatch in normal use; the reducer guard is a defense-in-depth).
3. If valid: returns a new state with `dimensions = { width, height }`, `grid = createGrid(width, height)`, `genCount = 0`, `running = false` (pause + clear).

### Form behavior (locked)

- **Two number inputs** (`<input type="number" min="5" max="100" step="1">`) for width and height, with visible labels ("Width", "Height").
- **Apply button** (`<button type="submit">Apply</button>`) — submit is form-level (Enter key works). **No live-update**; the user explicitly applies the new size. Reason: typing "30" character-by-character from "100" would otherwise blow through "10" and "1" as transient resizes. Submit-on-Apply is the simpler, more honest UX.
- **Validation messaging** — on submit with an invalid value, render an inline error adjacent to the offending input (e.g., `role="alert"` `<p>` showing "Width must be between 5 and 100"). Do NOT use `alert()`.
- **Default values** — width=30, height=30 (project-context rule #17).
- **Form is in scope of the simulation** — when the user is editing the form, the canvas placeholder remains visible and untouched until Apply.

### Layout (architecture §6, scaffolded reality, NFR1)

**Locked: CSS Modules** (`apps/web/src/app/page.module.css`) for the page shell. **NOT Tailwind.** Architecture §4.6 specified Tailwind, but the actual Nx scaffold landed CSS Modules and the Tailwind setup (`@nx/next:setup-tailwind`) was deferred. Adding Tailwind mid-epic is its own scaffolding PR and is **out of scope for Story 3.1**. The CSS Module approach satisfies NFR1 cleanly; the architecture's styling choice was about *consistency*, and CSS Modules satisfies that for the duration of the MVP. **Do not propose installing Tailwind in this story.**

> **SM resolution of architecture-vs-scaffold mismatch:** Architecture §4.6 picked Tailwind; the scaffolded `apps/web` ships CSS Modules. Rather than block Epic 3 on a Tailwind setup PR, this and subsequent stories use CSS Modules. The README's "trade-offs" section (Story 4.4) notes the deviation. If a future story re-introduces Tailwind, Stories 3.1–3.5 are pure-CSS-Modules and can be migrated wholesale in one PR.

**Page layout (locked):**

```
┌─────────────────────────────────────────────┐
│  <h1>Conway's Game of Life</h1>             │
├─────────────────────────────────────────────┤
│  ┌─ form ──────┐  ┌─ canvas placeholder ─┐  │
│  │ Width: [30] │  │                       │  │
│  │ Height: [30]│  │   (Story 3.2 fills)   │  │
│  │ [Apply]     │  │                       │  │
│  │ controls    │  └───────────────────────┘  │
│  │ (Story 3.3+)│                             │
│  └─────────────┘                             │
└─────────────────────────────────────────────┘
```

**Responsive (CSS Module + container query / media query):**

- **Desktop (`min-width: 768px`):** form on the left in a sidebar (~280px), canvas placeholder fills remaining width. `display: flex; flex-direction: row;`.
- **Mobile (`max-width: 767px`, validates the 375px portrait NFR1 case):** form stacks above the canvas placeholder. `display: flex; flex-direction: column;`. No horizontal scroll: `body { overflow-x: hidden; }` is acceptable, but the cleaner shape is `width: 100%` on the page wrapper and `max-width: 100%` on inner elements.
- **No horizontal scroll at 375px** — verified by Story 4.3's Playwright spec at the epic level; this story's component test asserts the CSS class is applied at the appropriate breakpoint via a JSDOM-level check (or, more pragmatically, by snapshotting the CSS Module's class names — see test plan).

### File layout (locked)

```
apps/web/src/app/
  page.tsx                              # MODIFIED — replaces scaffolded Nx welcome page
  page.module.css                       # MODIFIED — replaces scaffolded styles
  layout.tsx                            # MODIFIED — update <title> and <description>
  global.css                            # MODIFIED — minimal reset (kept lightweight)
  state/
    simulation-state.ts                 # NEW — types, reducer, initial state
    simulation-state.spec.ts            # NEW — reducer unit tests
  components/
    GridSizeForm.tsx                    # NEW — width/height form
    GridSizeForm.module.css             # NEW
    GridSizeForm.spec.tsx               # NEW — RTL tests
```

**Why a `state/` folder rather than colocating with `page.tsx`:** Stories 3.2–3.5 each add reducer cases, and a separate file keeps the reducer + tests reviewable in isolation. Architecture §6 lists `apps/web/app/components/` and `apps/web/app/hooks/` — the `state/` folder is a sibling that the architecture doc does not enumerate but does not exclude.

### Imports from `libs/sim` (locked)

Use only the public barrel. **`@cgol-scaffold/sim`** is the workspace alias (the actual scope is `@cgol-scaffold/*`, not architecture §6's stale `@conways-game-of-life/*`). Imports allowed in Story 3.1:

```typescript
import { createGrid, clearGrid, type Grid } from '@cgol-scaffold/sim';
```

**Forbidden:** any deep import like `import ... from '@cgol-scaffold/sim/src/lib/grid.js'`. Module-boundary lint enforces this (see `nx-tag-policy.md`). Use the barrel only.

---

## Test plan (Jest + React Testing Library, in `apps/web/src/`)

### `apps/web/src/app/state/simulation-state.spec.ts` — reducer tests

`describe('simulationReducer — resize action (Story 3.1)')`
- `it('AC-3: dispatching resize with valid 50×40 produces a 50×40 empty grid and zeroes genCount')` — covers AC-3.
- `it('AC-4: dispatching resize with width=0 returns state unchanged (validation guard)')` — covers AC-4 reducer-level branch.
- `it('AC-4: dispatching resize with width=200 returns state unchanged')` — covers AC-4 upper-bound.
- `it('AC-4: dispatching resize with non-integer width=10.5 returns state unchanged')` — covers AC-4 non-integer rejection.
- `it('AC-5: dispatching resize when running=true sets running=false (pause + clear)')` — covers AC-5 reducer-level branch.
- `it('resize allocates a new Grid object (reference-distinct from previous)')` — defense-in-depth against accidental mutation.
- `it('resize at min bounds (5×5) succeeds')` — boundary case.
- `it('resize at max bounds (100×100) succeeds')` — boundary case.

### `apps/web/src/components/GridSizeForm.spec.tsx` — component tests (RTL)

`describe('GridSizeForm — render')`
- `it('renders width and height inputs with default values 30 and 30')` — verifies project-context rule #17 wired into the UI.
- `it('renders an Apply button with an accessible name')` — `screen.getByRole('button', { name: /apply/i })`.
- `it('inputs have visible labels (associated via htmlFor / id)')` — `screen.getByLabelText(/width/i)` finds the input.

`describe('GridSizeForm — submit, valid input')`
- `it('AC-3: submitting valid 50×40 calls onResize({width: 50, height: 40})')` — RTL `userEvent.clear`, `userEvent.type`, `userEvent.click(applyButton)`. Mock `onResize` is asserted with the right args.
- `it('AC-3: submitting via Enter key (form submit) calls onResize')` — keyboard-only path.

`describe('GridSizeForm — submit, invalid input (AC-4)')`
- `it('AC-4: submitting width=0 shows an inline error and does NOT call onResize')`.
- `it('AC-4: submitting width=200 (above max) shows error and does NOT call onResize')`.
- `it('AC-4: submitting non-numeric (HTML number input rejects but defensive: empty string) shows error and does NOT call onResize')`.
- `it('AC-4: error message has role="alert" so screen readers announce it')`.
- `it('AC-4: previous size is retained — onResize is not called with stale args')`.

`describe('GridSizeForm — accessibility baseline')`
- `it('inputs are reachable via Tab in the order: width, height, Apply')` — keyboard a11y precursor for Story 4.2.
- `it('the form element wraps inputs and submit button (semantic <form>)')` — `container.querySelector('form')` is non-null.

### Page-level integration test (`apps/web/src/app/page.spec.tsx`)

`describe('page (Story 3.1) — initial render')`
- `it('renders the title "Conway\'s Game of Life"')` — `screen.getByRole('heading', { level: 1 })`.
- `it('renders the GridSizeForm with default 30×30')` — finds the inputs.
- `it('renders a canvas placeholder div with sensible dimensions')` — Story 3.2 will replace this with `<canvas>`. For Story 3.1, a `<div data-testid="canvas-placeholder">` is sufficient. The test asserts the placeholder is in the DOM.

`describe('page (Story 3.1) — resize integration')`
- `it('AC-3: submitting GridSizeForm with 50×40 updates the canvas placeholder dimensions and resets gen counter display to 0')` — full integration: form submit → reducer → re-render. Counter display might not exist yet (Story 3.3); if absent, this test asserts the reducer state via a `data-testid="gen-count"` placeholder rendered as `0` in the page shell. **Story 3.3 will replace the placeholder counter with the real one bound to `state.genCount`.**

---

## Dev notes

These execution rules apply to **every** Epic 3 story. Read them once, then refer back as needed.

### Hard rules (encoded in every Epic 3 story)

- **TypeScript strict** — `"strict": true` and `"noUncheckedIndexedAccess": true` are on. No `any`. No `@ts-ignore`. No `@ts-expect-error` without a one-line justification comment.
- **No external state libraries** — `useState`, `useReducer`, `useEffect`, `useRef`, `useCallback`, `useMemo` only. NO Zustand, Jotai, Redux, MobX, Recoil, Valtio, etc. (project-context rule §Forbidden.)
- **Pure-function logic STAYS in `libs/sim`** — UI never re-implements Conway. All grid mutations go through `@cgol-scaffold/sim` exports.
- **Imports from libs use the public alias** — `@cgol-scaffold/sim`, never `../../../libs/sim/...`. The Nx tag rule (`scope:app` → `scope:sim`) catches the alias-form; relative deep imports bypass the rule and are an anti-pattern.
- **No `Math.random` or `Date.now` in pure paths** — UI may use them in event handlers or refs (e.g., `performance.now()` in the rAF loop). The reducer is pure: it must be deterministic given `(state, action)`. Randomization (Story 3.4) calls `randomizeGrid` which already isolates `Math.random` behind its injectable `rng` parameter.
- **Accessible names on every interactive control** — every `<button>`, `<input>`, `<input type="range">` has either a visible label or `aria-label`. Story 4.2 audits this; bake it in correctly the first time.
- **Test framework: Jest 30 + React Testing Library + `@testing-library/user-event`.** Component tests in `apps/web/src/**/*.spec.tsx`. The existing `apps/web/jest.config.cts` already supports `tsx` + jsdom.
- **Behavior-first tests, not pixel snapshots.** Assert clicks → reducer dispatches; assert reducer dispatches → state shape. Do NOT use `toMatchSnapshot` against rendered HTML for these stories.
- **No E2E in Epic 3** — Epic 4 owns Playwright. Component tests go as deep as the rAF/canvas mock allows.

### Cross-story coordination — what Story 3.1 sets up for the rest of Epic 3

- **3.1 ships the reducer skeleton.** The discriminated `SimulationAction` union enumerates every action types Stories 3.2–3.5 will dispatch. Stories 3.2–3.5 *add cases* to the existing reducer, never widen the union or refactor the state shape.
- **3.1 ships the canvas placeholder.** Story 3.2 replaces the placeholder `<div data-testid="canvas-placeholder">` with a real `<canvas>`.
- **3.1 ships a pause stub for AC-5.** Story 3.3 wires the real `running: boolean` and Play/Pause controls; the resize-pauses-the-running-loop integration is verified end-to-end in Story 3.3.
- **3.1 ships the gen counter as a static `0` placeholder** (with `data-testid="gen-count"`). Story 3.3 binds it to `state.genCount`.

### Algorithmic guidance — reducer (non-prescriptive but locked-in-shape)

```typescript
// apps/web/src/app/state/simulation-state.ts
import { createGrid, clearGrid } from '@cgol-scaffold/sim';
import type { Grid } from '@cgol-scaffold/sim';

export const MIN_DIM = 5;
export const MAX_DIM = 100;

export interface SimulationState { /* per locked shape above */ }
export type SimulationAction = /* per locked union above */;

export const INITIAL_STATE: SimulationState = {
  grid: createGrid(30, 30),
  running: false,
  genCount: 0,
  genPerSec: 10,
  dimensions: { width: 30, height: 30 },
};

function isValidDim(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= MIN_DIM && n <= MAX_DIM;
}

export function simulationReducer(state: SimulationState, action: SimulationAction): SimulationState {
  switch (action.type) {
    case 'resize': {
      if (!isValidDim(action.width) || !isValidDim(action.height)) return state;
      return {
        ...state,
        grid: createGrid(action.width, action.height),
        dimensions: { width: action.width, height: action.height },
        genCount: 0,
        running: false,
      };
    }
    // Story 3.2 fills 'toggleCell'
    // Story 3.3 fills 'play', 'pause', 'tick', 'step'
    // Story 3.4 fills 'clear', 'randomize'
    // Story 3.5 fills 'setGenPerSec'
    case 'toggleCell':
    case 'play':
    case 'pause':
    case 'tick':
    case 'step':
    case 'clear':
    case 'randomize':
    case 'setGenPerSec':
      return state;
    default: {
      const _exhaustive: never = action;
      return state;
    }
  }
}
```

### What NOT to do here

- **Do not** install Tailwind in this story. CSS Modules is the path; Tailwind is a separate scaffolding PR if ever attempted.
- **Do not** use `useState` for individual fields (`width`, `height`, `grid`, `genCount`) when the reducer is the locked shape. The atomic tick transition in Story 3.3 needs `grid` and `genCount` to update together.
- **Do not** introduce a `useSimulation` custom hook in this story. Stories 3.3 and 3.5 introduce the `useSimulationLoop` rAF hook — that's a separate concern. The reducer + dispatch live directly in `page.tsx` for Story 3.1.
- **Do not** delete or rename action types from the union "because Story 3.1 doesn't use them." They're part of the locked contract for Stories 3.2–3.5.
- **Do not** wire the canvas in this story. Story 3.2 owns canvas rendering. Story 3.1's "canvas placeholder" is a `<div>` with a `data-testid` and CSS-driven dimensions matching `state.dimensions.width × cellSize` and `state.dimensions.height × cellSize` (cellSize=12 per Story 3.2's locked decision; Story 3.1 may import the constant from a shared `apps/web/src/app/constants.ts` if convenient, or hard-code 12 with a TODO comment that Story 3.2 owns the real source).
- **Do not** add a "Reset" button in this story — that's "Clear" in Story 3.4.

---

## Definition of done

- [ ] `apps/web/src/app/state/simulation-state.ts` exists with `SimulationState`, `SimulationAction`, `INITIAL_STATE`, and `simulationReducer` per the locked shape.
- [ ] `apps/web/src/app/state/simulation-state.spec.ts` exists with all reducer tests above; `pnpm nx test web` passes.
- [ ] `apps/web/src/components/GridSizeForm.tsx` exists with the locked behavior; component tests pass.
- [ ] `apps/web/src/app/page.tsx` is replaced — scaffolded Nx welcome content removed; renders `<h1>`, `GridSizeForm`, canvas placeholder, and a static `gen-count` placeholder.
- [ ] `apps/web/src/app/layout.tsx` `<title>` is updated to "Conway's Game of Life" and `<description>` reflects the app.
- [ ] CSS Modules drive layout; verified responsive at desktop (≥1280px) and mobile (375px portrait) — no horizontal scrollbar at 375px.
- [ ] `pnpm nx lint web` passes; `pnpm nx test web` passes; `pnpm nx typecheck web` passes.
- [ ] `pnpm nx run-many -t lint,test,typecheck` passes workspace-wide.
- [ ] Imports from `libs/sim` use the `@cgol-scaffold/sim` alias only — no relative cross-lib imports.
- [ ] No file outside `apps/web/src/` is modified.
- [ ] Sprint-status will be updated by the orchestrator.

---

## Out of scope

- Real `<canvas>` rendering — Story 3.2.
- Click-to-toggle interaction — Story 3.2.
- Play/Pause/Step buttons and live gen counter — Story 3.3.
- Clear and Randomize buttons — Story 3.4.
- Speed slider — Story 3.5.
- Playwright E2E — Story 4.1.
- Keyboard a11y audit — Story 4.2 (this story bakes in *baseline* a11y: labels, accessible names, semantic `<form>`).
- Tailwind installation — explicitly deferred (architecture says Tailwind, scaffold says CSS Modules; this story honors the scaffold).

---

## Files expected to be created or modified

| File | Action |
| --- | --- |
| `apps/web/src/app/page.tsx` | modified — replace Nx welcome content with the Conway page shell |
| `apps/web/src/app/page.module.css` | modified — replace scaffolded styles with the responsive shell layout |
| `apps/web/src/app/layout.tsx` | modified — update `<title>` and `<description>` metadata |
| `apps/web/src/app/global.css` | modified — minimal reset; remove scaffold-specific styles |
| `apps/web/src/app/state/simulation-state.ts` | created — types, reducer, initial state |
| `apps/web/src/app/state/simulation-state.spec.ts` | created — reducer unit tests |
| `apps/web/src/components/GridSizeForm.tsx` | created — width/height form |
| `apps/web/src/components/GridSizeForm.module.css` | created |
| `apps/web/src/components/GridSizeForm.spec.tsx` | created — RTL tests |
| `apps/web/src/app/page.spec.tsx` | created — page-level integration tests |
| `apps/web/src/app/constants.ts` | created (or noted as Story 3.2's responsibility) — `CELL_SIZE = 12`, `MIN_DIM = 5`, `MAX_DIM = 100`, `DEFAULT_GEN_PER_SEC = 10`, `DEFAULT_DENSITY = 0.3` |

No file outside `apps/web/src/` is modified. The scaffolded `apps/web/src/app/api/` route handlers are untouched.

---

## References

- `docs/planning-artifacts/epics.md` — Story 3.1 ACs (this file mirrors them verbatim, with the AC-5 cross-story scope note flagged in the AC section)
- `docs/planning-artifacts/architecture.md` §4.5 (state management — `useState`/`useReducer`), §6 (file layout under `apps/web/`), §10 Open Question 1 (resize-while-running pauses + clears)
- `docs/planning-artifacts/prd.md` FR1 (canvas size, 5–100 bounds), FR11 (responsive layout), NFR1 (375px portrait)
- `docs/project-context.md` rules #4 (sim purity), #17 (locked defaults: 30×30 default, 5–100 bounds, 10 gen/sec, 0.3 density), #20 (path alias for cross-lib imports), #32 (no external state libs)
- `libs/sim/src/index.ts` — public barrel: `createGrid`, `clearGrid`, `Grid` types consumed here
