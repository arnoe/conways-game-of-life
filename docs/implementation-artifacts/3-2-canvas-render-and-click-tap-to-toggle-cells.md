---
story_id: 3.2
epic: 3
title: Canvas render and click/tap-to-toggle cells
status: ready-for-dev
priority: MVP
estimated_effort: M
fr_nfr_coverage: [FR2, NFR4]
inputDocuments:
  - docs/planning-artifacts/epics.md
  - docs/planning-artifacts/architecture.md
  - docs/planning-artifacts/prd.md
  - docs/project-context.md
---

# Story 3.2 — Canvas render and click/tap-to-toggle cells

**Status:** `ready-for-dev`
**Epic:** 3 — Web app interactive MVP
**Priority:** MVP
**Effort:** M

---

## User story

**As** Casey,
**I want** to click (or tap) a cell on the canvas to toggle it alive/dead before pressing play,
**So that** I can paint a starting state I'm interested in.

---

## Acceptance criteria

Copied verbatim from `docs/planning-artifacts/epics.md` Story 3.2, with stable IDs added.

- **AC-1** — **Given** the simulation is paused and the canvas has rendered the current grid, **when** the user clicks a dead cell (mouse) or taps it (touch), **then** the cell becomes alive, is visibly distinguishable from dead cells (cyan-on-near-black per architecture §7.5), and the visible state change occurs within 50ms of the input event.

- **AC-2** — **Given** the simulation is paused, **when** the user clicks an alive cell, **then** the cell becomes dead.

- **AC-3** — **Given** the simulation is running, **when** the user clicks the canvas, **then** the toggle is a no-op (controls disabled while running, per FR2 default).

- **AC-4** — **Given** the rendering implementation, **when** the grid state changes, **then** a `useEffect([grid])` triggers a Canvas redraw using `fillRect` per architecture §5.3 (no DOM-per-cell rendering).

- **AC-5** — **Given** the click→grid-coordinate conversion, **when** the canvas is scaled by CSS to fit its container, **then** `getBoundingClientRect()` is used so coordinates remain accurate at any rendered size.

> **Story-3.2 scope clarification on AC-3.** Story 3.1 stubbed `running: false`. The "running" state machine fully wires in Story 3.3. AC-3 is verified in Story 3.2 by the Canvas component reading `running` from a prop (the page passes `state.running`); the unit test sets the prop to `true` and asserts `pointerdown` does not dispatch `toggleCell`. End-to-end (Play → click → no-op) is re-verified in Story 3.3's integration tests.

---

## Locked technical decisions

These are decisions Dev does **not** need to relitigate.

### Cell size and color palette (architecture §5.3, §7.5, locked)

- **`CELL_SIZE = 12`** (CSS pixels per cell). Architecture §5.3's pseudocode shows `cellSize` as a parameter; **the locked default for Epic 3 is 12**. This produces a 360×360 canvas at the default 30×30 grid, comfortably fits a 1280-wide desktop viewport, and at 100×100 the canvas is 1200×1200 (still scrollable on desktop, scaled-down on mobile via CSS).
- **Dead cell color: `#0a0a0a`** (near-black). Architecture §5.3 names this exactly.
- **Alive cell color: `#22d3ee`** (Tailwind `cyan-400`, but specified as a literal hex since this codebase ships CSS Modules — see Story 3.1's locked decision on Tailwind deferral). Architecture §5.3 names this exactly.
- **Grid lines:** **none in MVP.** Architecture §5.3's pseudocode does not draw grid lines. Adding 1px grid lines is a polish call deferred until performance and visual clarity actually need it; for the 30×30 default at `CELL_SIZE=12`, the cells are large enough that lines are unnecessary.

### DPR scaling for crisp rendering (locked)

The canvas is sized in CSS pixels at `width × CELL_SIZE` × `height × CELL_SIZE`, but its internal resolution accounts for `window.devicePixelRatio`:

```typescript
const dpr = window.devicePixelRatio || 1;
const cssWidth = grid.width * CELL_SIZE;
const cssHeight = grid.height * CELL_SIZE;
canvas.style.width = `${cssWidth}px`;
canvas.style.height = `${cssHeight}px`;
canvas.width = Math.round(cssWidth * dpr);
canvas.height = Math.round(cssHeight * dpr);
const ctx = canvas.getContext('2d')!;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels; the 2D transform handles the upscale
```

After `setTransform`, all `fillRect` calls work in CSS pixels — i.e., `ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE)`. **Set the transform every redraw**; resizing the canvas resets it.

### Render shape (architecture §5.3, locked)

```typescript
function renderGrid(ctx: CanvasRenderingContext2D, grid: Grid, cellSize: number) {
  const cssW = grid.width * cellSize;
  const cssH = grid.height * cellSize;
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, cssW, cssH);
  ctx.fillStyle = '#22d3ee';
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (grid.cells[y * grid.width + x] === 1) {
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }
}
```

Renders are triggered by **`useEffect([grid, cellSize])`** so any new grid (resize, toggle, tick from Story 3.3, randomize from Story 3.4) re-renders. The rAF loop in Stories 3.3/3.5 dispatches reducer actions; React's render cycle picks up the new grid and re-runs the render effect.

### Click/tap → grid coordinates (architecture §5.3, locked)

Use `pointerdown` (handles both mouse and touch). The handler:

1. Reads `event.clientX`, `event.clientY` and the canvas's `getBoundingClientRect()`.
2. Computes `cssX = event.clientX - rect.left`, `cssY = event.clientY - rect.top`.
3. Computes `gridX = Math.floor(cssX / CELL_SIZE_FROM_RECT)` where `CELL_SIZE_FROM_RECT = rect.width / grid.width` (so coordinates remain accurate even if CSS scales the canvas down on mobile per AC-5).
4. Bounds-checks `0 ≤ gridX < grid.width` and `0 ≤ gridY < grid.height`. If out of range (e.g., user clicked a sub-pixel border), no-op.
5. If `running === true`, no-op (AC-3).
6. Otherwise, dispatches `{ type: 'toggleCell', x: gridX, y: gridY }`.

**Touch-scroll friendliness:** the `pointerdown` handler does NOT call `event.preventDefault()` unconditionally. It calls `preventDefault()` only when the pointer event is on the canvas itself, so the user can still scroll the page by touch-dragging *outside* the canvas. The `<canvas>` element gets `style={{ touchAction: 'none' }}` so swipes on the canvas don't trigger native scroll/zoom; swipes elsewhere on the page scroll normally.

### Reducer addition (Story 3.2 fills the `'toggleCell'` case)

```typescript
// add to apps/web/src/app/state/simulation-state.ts
import { toggleCell } from '@cgol-scaffold/sim';

// in simulationReducer:
case 'toggleCell': {
  if (state.running) return state; // AC-3 reducer-level guard
  if (action.x < 0 || action.x >= state.dimensions.width) return state;
  if (action.y < 0 || action.y >= state.dimensions.height) return state;
  return { ...state, grid: toggleCell(state.grid, action.x, action.y) };
}
```

The `state.running` guard is defense-in-depth; the Canvas component's pointer handler already guards. **Both layers stay** — the reducer must be safe against any dispatch.

### Canvas mocking strategy for Jest tests (architecture §7.1 hints at jsdom limits; locked here)

**Locked: `jest-canvas-mock`** (npm package, well-known, lightweight). The architecture document doesn't name a canvas mock; this story locks the choice based on:
- It's the conventional Jest + jsdom solution for Canvas testing — installing it is a one-line `package.json` change and a single `setupFiles` line in `apps/web/jest.config.cts`.
- It implements enough of the Canvas 2D API (`fillRect`, `clearRect`, `fillStyle`, `setTransform`, `getContext`) for the render-side tests to drive the code without throwing.
- It does NOT pixel-test (we don't snapshot canvas output); it stubs the API so the code runs.

**Hand-rolling a stub** is the alternative, but it would re-implement what `jest-canvas-mock` already does and the package's surface is small. Choose `jest-canvas-mock`.

> **SM resolution of mock-strategy ambiguity:** Architecture is silent on canvas mocking. This story locks `jest-canvas-mock`. If `pnpm install` is forbidden mid-build for any reason (it is not — Story 3.2 is allowed to add dev dependencies), the fallback is a 20-line hand-rolled stub in `apps/web/src/test-utils/canvas-mock.ts` registered via `setupFiles`. Either path is acceptable; default to the package.

### File layout

```
apps/web/src/
  app/
    page.tsx                              # MODIFIED — replace canvas placeholder with <Canvas>
    state/
      simulation-state.ts                 # MODIFIED — fill 'toggleCell' reducer case
      simulation-state.spec.ts            # MODIFIED — add 'toggleCell' tests
  components/
    Canvas.tsx                            # NEW
    Canvas.module.css                     # NEW
    Canvas.spec.tsx                       # NEW — RTL + jest-canvas-mock
  app/
    constants.ts                          # MODIFIED if not yet — add CELL_SIZE = 12
```

`jest-canvas-mock` setup:

```typescript
// apps/web/jest.config.cts — add to the inner config object
setupFiles: ['jest-canvas-mock'],
```

```jsonc
// package.json — add to devDependencies
"jest-canvas-mock": "^2.5.2"
```

---

## Test plan (Jest + RTL, with `jest-canvas-mock`)

### `apps/web/src/app/state/simulation-state.spec.ts` — additions for Story 3.2

`describe('simulationReducer — toggleCell action (Story 3.2)')`
- `it('AC-1: toggleCell on a dead cell at (3, 5) makes it alive')` — covers AC-1 reducer-level branch.
- `it('AC-2: toggleCell on an alive cell at (3, 5) makes it dead')` — covers AC-2 reducer-level branch.
- `it('AC-3: toggleCell when running=true returns state unchanged')` — covers AC-3 reducer-level branch.
- `it('toggleCell with x=-1 (out of bounds) returns state unchanged')` — defense-in-depth.
- `it('toggleCell with x=width (one past end) returns state unchanged')` — defense-in-depth.
- `it('toggleCell allocates a new Grid object (immutability invariant)')` — verifies `@cgol-scaffold/sim`'s `toggleCell` returns a new grid and the reducer doesn't mutate.

### `apps/web/src/components/Canvas.spec.tsx` — component tests

`describe('Canvas — render')`
- `it('AC-4: renders a single <canvas> element (no DOM-per-cell)')` — `container.querySelectorAll('div[data-cell]').length === 0`. Asserts the architecture §5.3 contract.
- `it('canvas has CSS dimensions matching grid.width × CELL_SIZE and grid.height × CELL_SIZE')`.
- `it('canvas internal resolution accounts for devicePixelRatio')` — set `window.devicePixelRatio = 2`, assert `canvas.width === cssWidth * 2`.
- `it('AC-4: a useEffect on grid triggers redraw — fillRect is called for each alive cell')` — set up grid with 3 alive cells; render; verify `ctx.fillRect` was called for each (jest-canvas-mock records calls).
- `it('redraws when grid prop changes (rerender → effect re-runs)')` — render with grid A; rerender with grid B (different alive cells); assert second redraw happened.

`describe('Canvas — click/tap to toggle (AC-1, AC-2, AC-5)')`
- `it('AC-1: pointerdown at (10, 10) when CELL_SIZE=12 dispatches toggleCell(0, 0)')` — `fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 })`. Mock the canvas's `getBoundingClientRect()` to return `{ left: 0, top: 0, width: 360, height: 360, ... }`. Assert `onToggleCell` mock was called with `(0, 0)`.
- `it('pointerdown at (25, 14) dispatches toggleCell(2, 1)')` — covers a non-corner click; CELL_SIZE=12 → `floor(25/12)=2, floor(14/12)=1`.
- `it('AC-5: pointerdown when canvas is CSS-scaled to 50% (rect.width=180) computes grid coords from rect-derived cellSize')` — mock `getBoundingClientRect` to return `width: 180`, then a clientX of 6 should map to grid x=1 (cellSizeFromRect = 180/30 = 6, floor(6/6) = 1). Verifies AC-5 explicitly.
- `it('AC-2: pointerdown on an alive cell dispatches toggleCell — reducer flips it dead (integration with reducer in page test below)')` — at the component level, just assert the dispatch shape; reducer behavior is covered by reducer tests above.
- `it('pointerdown outside canvas bounds (clientX < rect.left) does not dispatch')` — defense; should not happen in practice but keep the bounds check.

`describe('Canvas — running state guards (AC-3)')`
- `it('AC-3: pointerdown when running=true does not dispatch toggleCell')` — pass `running={true}` prop; click; assert `onToggleCell` was NOT called.

`describe('Canvas — touch-scroll friendliness')`
- `it('canvas element has touch-action: none style (so swipes on it do not trigger scroll/zoom)')` — `canvas.style.touchAction === 'none'`.

### `apps/web/src/app/page.spec.tsx` — integration additions for Story 3.2

`describe('page (Story 3.2) — click toggles cells end-to-end')`
- `it('AC-1: pointerdown at canvas (10, 10) when paused → cell (0, 0) becomes alive')` — full integration: render the page, fire pointerdown, query the reducer's grid via `data-testid="canvas"` + jest-canvas-mock's recorded fillRect calls (or, simpler, expose the grid via `data-testid="alive-count"` debug-output on the page during dev — remove before release, OR query reducer state another way).
- `it('AC-2: clicking an already-alive cell makes it dead')`.

---

## Dev notes

### Hard rules (Epic 3-wide; restated for Dev's convenience)

- **TypeScript strict, no `any`, no `@ts-ignore`.**
- **No external state libs.**
- **`@cgol-scaffold/sim` imports only.** This story uses `toggleCell` (already exported from the barrel — verified in `libs/sim/src/index.ts`).
- **Accessible names on every interactive control.** The `<canvas>` is not a control in the WCAG-button sense, but it has an accessible role: add `aria-label="Conway grid (click cells to toggle alive/dead)"` to the canvas element. Story 4.2 will audit this.
- **No `Math.random` or `Date.now` in this story.** Pointer events provide their own timestamps.

### Cross-story coordination

- **Builds on Story 3.1.** Story 3.1's `simulationReducer` is extended (not refactored) to fill the `'toggleCell'` case.
- **Story 3.3 wires `running` to the real Play/Pause state.** This story's `running` prop on `<Canvas>` is sourced from `state.running` which Story 3.1 stubbed to `false`. Story 3.3's integration tests re-verify AC-3 with the real running state.
- **`<Canvas>` accepts `running`, `grid`, `onToggleCell` props** — no internal state. State lives in the page-level reducer (project rule).

### What NOT to do here

- **Do not** render the grid as DOM `<div>`s. Architecture §5.3 explicitly bans it; AC-4 fails if you do.
- **Do not** render the grid as SVG. Same reason.
- **Do not** call `event.preventDefault()` unconditionally in the pointer handler — that breaks page scroll on touch devices. Use `touch-action: none` on the canvas element only.
- **Do not** put `running` in a `useRef` to "avoid re-renders on Play/Pause." Re-renders here are negligible; the rAF accumulator (Story 3.5) is the only place where a `useRef` is justified. Keep `running` in reducer state.
- **Do not** install Tailwind to get `cyan-400` and `neutral-950`. Use the literal hex values — see locked palette above.
- **Do not** add a useState for the canvas DOM node — use `useRef<HTMLCanvasElement>(null)`.
- **Do not** run the render loop (`useEffect`-driven render) at 60fps — this is a state-driven render, not a per-frame render. Only re-render on grid change. The rAF loop dispatches `'tick'` (Story 3.3) which produces a new grid; React rerenders; this `useEffect([grid])` runs once per tick. That is the correct cadence.

### Algorithmic guidance — Canvas component (non-prescriptive but locked-in-shape)

```tsx
'use client';

import { useEffect, useRef } from 'react';
import type { Grid } from '@cgol-scaffold/sim';
import { CELL_SIZE } from '../app/constants.js';
import styles from './Canvas.module.css';

interface CanvasProps {
  grid: Grid;
  running: boolean;
  onToggleCell: (x: number, y: number) => void;
}

export function Canvas({ grid, running, onToggleCell }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = grid.width * CELL_SIZE;
    const cssH = grid.height * CELL_SIZE;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.fillStyle = '#22d3ee';
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (grid.cells[y * grid.width + x] === 1) {
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      }
    }
  }, [grid]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (running) return; // AC-3
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    if (cssX < 0 || cssY < 0 || cssX >= rect.width || cssY >= rect.height) return;
    const cellSizeFromRect = rect.width / grid.width;   // AC-5: derive from rect, not the constant
    const gx = Math.floor(cssX / cellSizeFromRect);
    const gy = Math.floor(cssY / cellSizeFromRect);
    if (gx < 0 || gx >= grid.width || gy < 0 || gy >= grid.height) return;
    onToggleCell(gx, gy);
  };

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      aria-label="Conway grid (click cells to toggle alive/dead)"
      data-testid="canvas"
    />
  );
}
```

---

## Definition of done

- [ ] `apps/web/src/components/Canvas.tsx` exists and renders a `<canvas>` with DPR scaling and `fillRect`-based draw per the locked shape.
- [ ] `apps/web/src/components/Canvas.spec.tsx` exists with all tests above; passes via `jest-canvas-mock`.
- [ ] `apps/web/src/app/state/simulation-state.ts` `'toggleCell'` reducer case is filled and tested.
- [ ] `apps/web/src/app/page.tsx` replaces the placeholder with `<Canvas>` and wires `state.grid`, `state.running`, and a `dispatch({type: 'toggleCell', x, y})` callback.
- [ ] `apps/web/src/app/constants.ts` exports `CELL_SIZE = 12` (created in Story 3.1 or here, whichever lands first).
- [ ] `package.json` adds `jest-canvas-mock` as a devDependency (or hand-rolled stub if Dev prefers; default is the package).
- [ ] `apps/web/jest.config.cts` `setupFiles` includes `jest-canvas-mock` (or the path to the hand-rolled stub).
- [ ] DPR scaling produces a crisp render at `window.devicePixelRatio = 2` (verified by component test asserting internal `canvas.width === cssW * 2`).
- [ ] Click coordinates remain accurate under CSS scaling (AC-5 component test passes with a half-scaled `rect.width`).
- [ ] `pnpm nx lint web` passes; `pnpm nx test web` passes; `pnpm nx typecheck web` passes.
- [ ] Imports from `libs/sim` use `@cgol-scaffold/sim` only.
- [ ] No file outside `apps/web/`, `package.json`, or `pnpm-lock.yaml` is modified.
- [ ] Sprint-status will be updated by the orchestrator.

---

## Out of scope

- Play/Pause/Step (`running` is sourced from reducer but the state machine isn't fully wired until Story 3.3) — Story 3.3.
- Generation counter binding — Story 3.3.
- Clear and Randomize buttons — Story 3.4.
- Speed slider — Story 3.5.
- Performance optimization (delta-render, cached fillStyle, etc.) — explicitly deferred. The MVP perf budget (NFR4: 50×50 @ 30 gen/sec, <50ms input latency) is met by the naive full-redraw at this scale.
- Pinch-zoom or pan on the canvas — out of PRD scope.
- Pixel snapshot tests of canvas output — discouraged; behavior tests via mock-recorded `fillRect` calls cover the contract.

---

## Files expected to be created or modified

| File | Action |
| --- | --- |
| `apps/web/src/components/Canvas.tsx` | created |
| `apps/web/src/components/Canvas.module.css` | created — minimal: `display: block; max-width: 100%;` for mobile shrink |
| `apps/web/src/components/Canvas.spec.tsx` | created |
| `apps/web/src/app/state/simulation-state.ts` | modified — fill `'toggleCell'` reducer case |
| `apps/web/src/app/state/simulation-state.spec.ts` | modified — add `'toggleCell'` tests |
| `apps/web/src/app/page.tsx` | modified — replace canvas placeholder with `<Canvas>` and wire props |
| `apps/web/src/app/page.spec.tsx` | modified — add integration tests for click → reducer → re-render |
| `apps/web/src/app/constants.ts` | created or modified — `CELL_SIZE = 12` if Story 3.1 didn't land it |
| `apps/web/jest.config.cts` | modified — add `setupFiles: ['jest-canvas-mock']` |
| `package.json` | modified — add `"jest-canvas-mock": "^2.5.2"` to devDependencies |
| `pnpm-lock.yaml` | modified — `pnpm install` regenerates |

No file outside `apps/web/`, `package.json`, or `pnpm-lock.yaml` is modified.

---

## References

- `docs/planning-artifacts/epics.md` — Story 3.2 ACs (this file mirrors them verbatim, with the AC-3 cross-story scope note flagged in the AC section)
- `docs/planning-artifacts/architecture.md` §5.3 (render shape, fillRect strategy, click→grid coords via getBoundingClientRect, locked color palette `#0a0a0a` / `#22d3ee`), §4.3 (Canvas chosen over DOM/SVG), §7.5 (cyan-on-near-black contrast)
- `docs/planning-artifacts/prd.md` FR2 (toggle cells while paused; <50ms perceived latency), NFR4 (perf budget — naive redraw is sufficient at MVP scale)
- `docs/project-context.md` rules #4 (sim purity), #8 (`Uint8Array` flat grid), #20 (path alias)
- `docs/implementation-artifacts/3-1-page-shell-canvas-size-form-and-responsive-layout.md` — Story 3.1's reducer skeleton this story extends
- `libs/sim/src/index.ts` — `toggleCell` consumed here
