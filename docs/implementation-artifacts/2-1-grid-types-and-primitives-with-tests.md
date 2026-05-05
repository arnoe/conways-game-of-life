---
story_id: 2.1
epic: 2
title: Grid types and primitives with tests
status: ready-for-dev
priority: MVP
estimated_effort: S
fr_nfr_coverage: [FR10, NFR3]
inputDocuments:
  - docs/planning-artifacts/epics.md
  - docs/planning-artifacts/architecture.md
  - docs/planning-artifacts/prd.md
  - docs/project-context.md
---

# Story 2.1 — Grid types and primitives with tests

**Status:** `ready-for-dev`
**Epic:** 2 — Pure simulation core (`libs/sim`)
**Priority:** MVP
**Effort:** S

---

## User story

**As** a developer of the simulation core,
**I want** a `Grid` type backed by a flat `Uint8Array` plus pure helpers (`createGrid`, `cloneGrid`, `getCell`, `setCell`, `toggleCell`, `clearGrid`, `countNeighbors`),
**So that** the rules engine has a stable, allocation-controlled, framework-free data model to operate on.

---

## Acceptance criteria

Copied verbatim from `docs/planning-artifacts/epics.md` Story 2.1, with stable IDs added.

- **AC-1** — **Given** the `Grid` interface is defined as `{ width: number; height: number; cells: Uint8Array }` in `libs/types` and re-exported from `libs/sim`, **when** any helper is called, **then** it returns a new `Grid` rather than mutating the input (immutability invariant). **And** `getCell(g, x, y)` returns `0` for any out-of-bounds `(x, y)` (off-grid is dead, per FR10).

- **AC-2** — **Given** Jest specs co-located with the source, **when** `pnpm nx test sim` runs, **then** specs assert: `createGrid(w, h)` produces `cells.length === w*h` all-zero; `setCell` flips exactly the indexed cell; `toggleCell` is its own inverse; `clearGrid` zeroes every cell; `cloneGrid` returns a deep-equal but reference-distinct grid.

- **AC-3** — **Given** the boundary rule from story 1.2 is active, **when** any of these source files imports React, `next/*`, `@nestjs/*`, or `fetch`, **then** lint fails (verified by an eslint `no-restricted-imports` rule scoped to `libs/sim`).

> **Story-2.1 scope clarification on AC-1 — `libs/types` does not exist yet.** Architecture §6 lists `libs/types` as the canonical home for `Grid`, but its owning story has not yet shipped. For this story, declare `Grid`, `Coord`, and the rest of the public types **inline in `libs/sim/src/lib/types.ts`** and re-export them from `libs/sim/src/index.ts`. When `libs/types` lands later (during stretch tier or its own dedicated story), the types move there with a single search-and-replace; the public surface from `libs/sim` does not change. Do not create `libs/types` as a side-effect of this story.

---

## Locked technical decisions

These are decisions Dev does **not** need to relitigate. Defer to architecture.md / project-context.md if anything below appears ambiguous; nothing should.

### Public type surface (architecture §5.1, locked verbatim)

Lives in `libs/sim/src/lib/types.ts`. All types `readonly` where they appear in public APIs.

```typescript
// libs/sim/src/lib/types.ts
export interface Grid {
  readonly width: number;
  readonly height: number;
  readonly cells: Uint8Array; // length === width * height; 1 = alive, 0 = dead
}

/** A grid coordinate. Convenience tuple alias used by patterns/tests. */
export type Coord = readonly [number, number];

/** Cell value type — narrowed numeric so callers don't pass arbitrary numbers. */
export type Cell = 0 | 1;
```

### Public function surface (architecture §5.1, locked verbatim — lives in `libs/sim/src/lib/grid.ts`)

```typescript
export function createGrid(width: number, height: number): Grid;
export function cloneGrid(grid: Grid): Grid;
export function getCell(grid: Grid, x: number, y: number): Cell; // off-grid returns 0
export function setCell(grid: Grid, x: number, y: number, alive: Cell): Grid; // returns new grid
export function toggleCell(grid: Grid, x: number, y: number): Grid;
export function clearGrid(grid: Grid): Grid;
export function countNeighbors(grid: Grid, x: number, y: number): number; // off-grid neighbors counted as dead
```

`randomizeGrid` is **out of scope** for this story — Story 2.4 owns it (it requires the injectable RNG seam).

### Invariants (architecture §5.1, project-context rules #4, #8, #9)

- Pure functions only. No `Date.now`, no `Math.random`, no `fetch`, no `window`, no `document`, no React, no Next, no NestJS imports.
- `setCell` / `toggleCell` / `clearGrid` / `cloneGrid` allocate a **new** `Uint8Array` and return a new `Grid`. **Never** mutate the input `grid.cells`.
- `getCell(grid, x, y)` returns `0` for any `(x, y)` outside `[0, width) × [0, height)` — including negative coordinates. No throw.
- `countNeighbors(grid, x, y)` sums the eight Moore-neighborhood cells; off-grid neighbors are dead (count as 0). No toroidal wrap. PRD explicitly excludes wrap from MVP.
- `createGrid(0, 0)` returns a valid empty `Grid` with `cells.length === 0`. No throw on zero dimensions.
- `createGrid` throws `RangeError` only on **negative** dimensions or on `width * height` overflowing safe integer range. Not on user input — this is a programmer-error guard.

### File layout

```
libs/sim/src/
  index.ts                # public barrel — re-exports types + grid primitives ONLY
  lib/
    types.ts              # Grid, Coord, Cell
    grid.ts               # createGrid, cloneGrid, getCell, setCell, toggleCell, clearGrid, countNeighbors
    grid.spec.ts          # Jest specs for every function above
```

The generator-stub `libs/sim/src/lib/sim.ts` and `libs/sim/src/lib/sim.spec.ts` are **deleted** in this story. The placeholder `sim()` function ships nothing of value and the next stories don't reference it.

### `libs/sim/src/index.ts` public surface (locked)

```typescript
// libs/sim/src/index.ts — public barrel
export type { Grid, Coord, Cell } from './lib/types.js';
export {
  createGrid,
  cloneGrid,
  getCell,
  setCell,
  toggleCell,
  clearGrid,
  countNeighbors,
} from './lib/grid.js';
```

Do **not** re-export internal helpers, constants, or test fixtures. The barrel is the consumer-facing API.

### `no-restricted-imports` ESLint rule (architecture §9 R2, project-context rule #4)

The Nx tag rule forbids cross-lib imports of forbidden scopes, but it does **not** catch external npm packages like `react`, `next`, or `@nestjs/*`. Story 1.2 explicitly deferred this gap to the per-project ESLint rule that ships in **this** story.

Add a rule to `libs/sim/eslint.config.mjs` (the lib already owns its own config — see §"Files expected to be modified") that bans these imports outright. Ready-to-paste snippet:

```js
{
  files: ['**/*.ts', '**/*.tsx'],
  ignores: ['**/*.spec.ts', '**/*.spec.tsx'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          { name: 'react', message: 'libs/sim is pure — no React imports allowed.' },
          { name: 'react-dom', message: 'libs/sim is pure — no React DOM imports allowed.' },
        ],
        patterns: [
          { group: ['next', 'next/*'], message: 'libs/sim is pure — no Next.js imports allowed.' },
          { group: ['@nestjs/*'], message: 'libs/sim is pure — no NestJS imports allowed.' },
        ],
      },
    ],
    'no-restricted-globals': [
      'error',
      { name: 'fetch', message: 'libs/sim is pure — no network I/O allowed.' },
      { name: 'window', message: 'libs/sim is pure — no DOM globals allowed.' },
      { name: 'document', message: 'libs/sim is pure — no DOM globals allowed.' },
    ],
  },
},
```

The rule is intentionally **not** applied to `*.spec.ts` files — Jest specs occasionally import test helpers that look like restricted globals but are in fact harmless. The non-spec `.ts` files are the ones whose purity matters.

---

## Test plan (Jest, in `libs/sim/src/lib/grid.spec.ts`)

Tests are constraint-based, not coverage-padded. Each `it` block asserts one observable behavior tied to a locked invariant. Use small fixtures (1×1, 3×3, 5×5) — large grids belong in 2.2/2.3.

### `describe('createGrid')`
- `it('produces cells.length === w*h all-zero for 5×5')` — covers AC-2.
- `it('produces cells.length === 0 for 0×0 (degenerate, no throw)')` — locked invariant.
- `it('throws RangeError on negative dimensions')` — programmer-error guard.

### `describe('getCell')`
- `it('returns 0 for default-empty grid at any in-bounds coord')` — sanity.
- `it('returns 0 for negative x or y (off-grid is dead)')` — covers AC-1 second clause.
- `it('returns 0 for x >= width or y >= height (off-grid is dead)')` — covers AC-1.
- `it('returns 1 after setCell at the same coord')` — round-trip.

### `describe('setCell')`
- `it('flips exactly the indexed cell, not its neighbors')` — covers AC-2.
- `it('returns a new Grid with a new cells reference (immutability)')` — covers AC-1 first clause.
- `it('does not mutate the original grid')` — explicit input-immutability assertion.
- `it('is a no-op when x or y is out of bounds (returns equivalent grid, no throw)')` — defensive.

### `describe('toggleCell')`
- `it('is its own inverse: toggle twice === identity')` — covers AC-2.
- `it('does not mutate the original grid')`.

### `describe('clearGrid')`
- `it('zeroes every cell in a non-empty grid')` — covers AC-2.
- `it('returns a new Grid (immutability)')`.
- `it('returns an equivalent grid when input is already all-zero')`.

### `describe('cloneGrid')`
- `it('returns a deep-equal but reference-distinct grid')` — covers AC-2.
- `it('cloned grid mutations would not affect the original (independent buffers)')` — verify `cells` is a new `Uint8Array`, not a view over the same buffer.

### `describe('countNeighbors')`
- `it('returns 0 for an empty 3×3 grid at center (1,1)')`.
- `it('returns 8 for an all-alive 3×3 grid at center (1,1)')`.
- `it('returns 3 for an all-alive 3×3 grid at corner (0,0)')` — boundary case: 5 of 8 Moore neighbors are off-grid (dead), 3 in-bounds neighbors are alive.
- `it('returns 5 for an all-alive 3×3 grid at edge (1,0)')` — 3 of 8 Moore neighbors off-grid, 5 in-bounds neighbors alive.
- `it('returns 0 for any (x,y) when grid is empty (no live neighbors anywhere)')`.
- `it('returns 0 for off-grid coordinates (no throw)')` — defensive.

---

## Dev notes

These execution rules apply to **every** story in Epic 2. Do not deviate without orchestrator sign-off.

- **Pure functions only** — no `Date.now()`, no `Math.random()` directly inside any function (Story 2.4's `randomize` is the lone exception, and even then RNG is injected; the lib never imports `Math.random` at the top level).
- **No mutation of inputs** — every function returns a new `Grid` with a freshly-allocated `Uint8Array`.
- **TypeScript strict** — no `any`, no `@ts-ignore` to silence the strict check. `noUncheckedIndexedAccess` is in effect (architecture §4.2); index reads on `cells` may need `?? 0` or explicit bounds checks.
- **Test framework: Jest 30**. Test files alongside source as `*.spec.ts`.
- **Coverage is not enforced** (the brief warns against coverage-padding). Quality of tests > number of tests.
- **Workspace scope** is `@cgol-scaffold/*`. The path alias for this lib is `@cgol-scaffold/sim`. Do not introduce relative cross-lib imports (project-context rule #20).
- **Boundaries**: `scope:sim` may depend ONLY on `scope:types`. Currently no `libs/types` exists, so `libs/sim` has zero workspace deps — that is fine and intended for this story.
- **Stub deletion**: delete `libs/sim/src/lib/sim.ts` and `libs/sim/src/lib/sim.spec.ts`. The barrel re-export in `libs/sim/src/index.ts` is replaced wholesale per the locked snippet above. There is no value in keeping the placeholder `sim()` function around.
- **`noUncheckedIndexedAccess` reminder**: when reading `grid.cells[i]`, TypeScript will infer `number | undefined`. Two acceptable patterns: `(grid.cells[i] ?? 0)` or `grid.cells.at(i) ?? 0`. Pick one and use it consistently inside `grid.ts`.
- **Don't pre-build `step()` here** — that is Story 2.2's deliverable. `countNeighbors` is the helper that `step()` will call; it lives here because both grid primitives and rules need it.

### Cross-story coordination

- Story 2.2 depends on this story's `Grid`/`countNeighbors` surface.
- Story 2.3 depends on Story 2.2's `step()`.
- Story 2.4 is logically independent of 2.2 and 2.3; it depends only on this story's `createGrid` + `setCell`. Sequencing defaults to 2.1 → 2.2 → 2.3 → 2.4.

---

## Definition of done

- [ ] `libs/sim/src/lib/types.ts` exists and exports `Grid`, `Coord`, `Cell` per the locked snippet.
- [ ] `libs/sim/src/lib/grid.ts` exists and implements all seven primitives per the locked signatures.
- [ ] `libs/sim/src/lib/grid.spec.ts` exists and contains the test plan above; `pnpm nx test sim` passes.
- [ ] `libs/sim/src/index.ts` re-exports exactly the public surface listed above — no internal helpers leaked.
- [ ] `libs/sim/src/lib/sim.ts` and `libs/sim/src/lib/sim.spec.ts` (the generator stubs) are deleted.
- [ ] `libs/sim/eslint.config.mjs` includes the `no-restricted-imports` + `no-restricted-globals` block per the locked snippet.
- [ ] `pnpm nx lint sim` passes; `pnpm nx test sim` passes; `pnpm nx run-many -t lint,test` passes workspace-wide.
- [ ] PR is small, focused, and the commit subjects each summarize in one sentence (project-context rule #3).
- [ ] No file outside `libs/sim/**` and `libs/sim/eslint.config.mjs` is modified by this story. (No `apps/web`, no `apps/web-e2e`, no other libs.)
- [ ] No `Math.random`, `Date.now`, or DOM/network I/O appears anywhere in the production source under `libs/sim/src/lib/`.
- [ ] Sprint-status will be updated by the orchestrator (not by Dev as part of this story).

---

## Out of scope

- `step()` and the Conway rules engine — Story 2.2.
- Edge-case test coverage for `step()` — Story 2.3.
- `randomizeGrid` and the injectable RNG seam — Story 2.4.
- Named patterns (`block`, `blinker`, `glider`, `gosperGliderGun`) and `placePattern` — Story 5.1 (stretch).
- The `RuleSet` interface — Story 8.1 (stretch). Story 2.2 hardwires Conway B3/S23.
- Creating `libs/types` as a separate Nx lib — deferred (see scope clarification on AC-1). Types live in `libs/sim/src/lib/types.ts` for now.
- Any change to `apps/web` or `apps/web-e2e`.
- Any change to the root ESLint config or root `tsconfig.base.json`.

---

## Files expected to be created or modified

| File | Action |
| --- | --- |
| `libs/sim/src/lib/types.ts` | created — exports `Grid`, `Coord`, `Cell` |
| `libs/sim/src/lib/grid.ts` | created — implements seven primitives |
| `libs/sim/src/lib/grid.spec.ts` | created — Jest spec per the test plan |
| `libs/sim/src/index.ts` | modified — replace generator stub barrel with the locked re-export list |
| `libs/sim/src/lib/sim.ts` | **deleted** — generator stub, no longer needed |
| `libs/sim/src/lib/sim.spec.ts` | **deleted** — generator stub spec |
| `libs/sim/eslint.config.mjs` | modified — add `no-restricted-imports` + `no-restricted-globals` block per the locked snippet |

No other files in the workspace are touched.

---

## References

- `docs/planning-artifacts/epics.md` — Story 2.1 ACs (this file mirrors them verbatim)
- `docs/planning-artifacts/architecture.md` §4.4 (flat `Uint8Array` grid), §5.1 (public API surface), §9 R2 (`no-restricted-imports` rationale)
- `docs/planning-artifacts/prd.md` FR10 (deterministic Conway rules + edge cases), NFR3 (pure-function sim, framework-free, < 10s test suite)
- `docs/project-context.md` rules #4 (sim purity), #8 (`Uint8Array` grid), #9 (`step` purity invariants), #20 (path aliases)
- `docs/implementation-artifacts/1-2-configure-nx-tags-and-prove-module-boundaries-fire.md` — confirms the `scope:sim` → `scope:types` boundary is already enforced; this story adds the per-lib `no-restricted-imports` complement
