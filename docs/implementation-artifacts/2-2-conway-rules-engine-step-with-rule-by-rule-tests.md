---
story_id: 2.2
epic: 2
title: Conway rules engine `step()` with rule-by-rule tests
status: ready-for-dev
priority: MVP
estimated_effort: M
fr_nfr_coverage: [FR10, NFR3]
inputDocuments:
  - docs/planning-artifacts/epics.md
  - docs/planning-artifacts/architecture.md
  - docs/planning-artifacts/prd.md
  - docs/project-context.md
---

# Story 2.2 — Conway rules engine `step()` with rule-by-rule tests

**Status:** `ready-for-dev`
**Epic:** 2 — Pure simulation core (`libs/sim`)
**Priority:** MVP
**Effort:** M

---

## User story

**As** a developer of the simulation core,
**I want** a pure `step(grid: Grid): Grid` that applies Conway's four rules with off-grid neighbors treated as dead,
**So that** FR10 has a single canonical implementation that both the web app and (stretch) the API can reuse.

---

## Acceptance criteria

Copied verbatim from `docs/planning-artifacts/epics.md` Story 2.2, with stable IDs added.

- **AC-1** — **Given** a 3×3 grid with a single live cell, **when** `step()` is applied, **then** the resulting grid has zero live cells (rule 1: underpopulation).

- **AC-2** — **Given** a 3×3 grid with a 2×2 block of live cells, **when** `step()` is applied repeatedly across five generations, **then** the grid is unchanged each generation (rule 2: 2–3 neighbors survive; canonical still life).

- **AC-3** — **Given** a 5×5 grid with a horizontal blinker (three live cells in a row), **when** `step()` is applied, **then** the next generation has a vertical blinker, and the generation after returns to horizontal (rule 4 reproduction + rule 1 underpopulation; period-2 oscillator).

- **AC-4** — **Given** a 5×5 grid where a live cell has 4+ live neighbors, **when** `step()` is applied, **then** that cell is dead in the next generation (rule 3: overpopulation).

- **AC-5** — **Given** a grid configured per the canonical glider pattern on a sufficiently large grid, **when** `step()` is applied four times, **then** the live-cell positions translate by `(1, 1)` relative to the start (canonical spaceship).

- **AC-6** — **Given** the same input grid, **when** `step()` is called 100 times in a loop on independent copies, **then** all 100 outputs are byte-identical (determinism).

- **AC-7** — **Given** all the above tests are co-located in `libs/sim/src/lib/rules/conway.spec.ts`, **when** `pnpm nx test sim` runs, **then** all tests pass and the suite completes in under 10 seconds.

---

## Locked technical decisions

These are decisions Dev does **not** need to relitigate. Defer to architecture.md / project-context.md if anything below appears ambiguous; nothing should.

### Public function signature (architecture §5.1, locked verbatim)

```typescript
// libs/sim/src/lib/rules/conway.ts
export function step(grid: Grid): Grid;
```

That is the entire public surface this story adds. The `step` export is added to the public barrel `libs/sim/src/index.ts`.

### Rules engine: hardwire Conway B3/S23 — do NOT build the `RuleSet` interface yet

Architecture §5.1 documents a `RuleSet` interface for stretch FR16 (HighLife / pluggable rules), but architecture §4 implementation sequence and the epics §Epic 8 boundary make it explicit: the `RuleSet` abstraction lands in **Story 8.1**, not here. Story 2.2 ships **only** the canonical Conway implementation as the directly-exported `step` function. Story 8.1 will later refactor: extract `step` into `conwayRules.step`, define `RuleSet`, add `highLifeRules`, and update the public barrel. That refactor is one PR; doing it now would be premature abstraction and would dilute Story 2.2's signal.

**Implication for this story:** export `step` directly. Do not export a `conwayRules` object, do not export a `RuleSet` type, do not parameterize `step` with a rule descriptor. Hardwire B3/S23 (a dead cell with exactly 3 live neighbors becomes alive; a live cell with 2 or 3 live neighbors stays alive; all other cells die).

### Conway's four rules (locked semantics — applied to every cell simultaneously)

Off-grid neighbors are dead. No toroidal wrap. PRD MVP excludes wrap.

| Rule | Predicate | Outcome |
| --- | --- | --- |
| **R1 Underpopulation** | live cell with `< 2` live neighbors | dies |
| **R2 Survival** | live cell with `2` or `3` live neighbors | stays alive |
| **R3 Overpopulation** | live cell with `> 3` live neighbors | dies |
| **R4 Reproduction** | dead cell with **exactly** `3` live neighbors | becomes alive |

Equivalently: B3/S23. A cell is alive in generation N+1 iff it had exactly 3 live neighbors in N (any state), OR it was alive in N and had exactly 2 live neighbors. Both formulations produce the same output; pick whichever reads cleaner.

### Implementation invariants (architecture §5.1, project-context rule #9)

- **Pure**. No `Date.now`, no `Math.random`, no I/O, no React/DOM/Next/NestJS imports. The `no-restricted-imports` rule from Story 2.1 already enforces this — do not loosen it.
- **No mutation of input**. `step(grid)` returns a new `Grid` with a freshly-allocated `Uint8Array` of length `width * height`. The input `grid.cells` is read-only.
- **Allocates exactly one new `Uint8Array` per call**. Use `new Uint8Array(grid.width * grid.height)` for the output buffer; do not allocate per-cell scratch buffers.
- **Off-grid neighbors are dead**. Reuse `countNeighbors` from Story 2.1 (it already handles bounds correctly). Do not re-implement neighbor math inline.
- **Empty grid stays empty**. `step(createGrid(0, 0))` returns a `Grid` with `cells.length === 0` — verified explicitly in Story 2.3, but the implementation must handle this without throwing.
- **Determinism is structural, not coincidental**. The function takes one input and produces one output via deterministic arithmetic on `Uint8Array`. Repeated calls on independent copies of the same input must return byte-identical buffers (AC-6).

### File layout

```
libs/sim/src/
  index.ts                       # public barrel — add `step` export
  lib/
    types.ts                     # (from Story 2.1)
    grid.ts                      # (from Story 2.1)
    grid.spec.ts                 # (from Story 2.1)
    rules/
      conway.ts                  # NEW — exports `step(grid: Grid): Grid`
      conway.spec.ts             # NEW — rule-by-rule + canonical-pattern tests
      fixtures.ts                # NEW (optional) — shared blinker/block/glider helpers used by 2.2 and 2.3
```

`fixtures.ts` is optional — if Dev finds the same hand-rolled grid construction repeating across 2.2 and 2.3 specs, factor it out. Otherwise inline. This is a judgment call; do not pre-emptively factor.

### Public barrel update (locked)

```typescript
// libs/sim/src/index.ts — add `step` to the existing exports from Story 2.1
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
export { step } from './lib/rules/conway.js';
```

---

## Test plan (Jest, in `libs/sim/src/lib/rules/conway.spec.ts`)

**Constraint-based, not coverage-padded.** Every `it()` block pins to one named rule (R1–R4) or one canonical pattern (block, blinker, glider) — the kind of test the panel reads as "this engineer constrained the behavior, not just hit the lines."

Use small hand-computed fixtures. Where the expected next-generation grid is non-obvious (the all-alive-3×3 fixture, the corner cases), assert the entire output grid cell-by-cell — AC-1/2/3 specifically require comparing to a hand-computed reference, not just a live-count heuristic.

Helper recommendation: write a tiny `gridFromRows(rows: string[])` test util that takes `['.X.', 'XXX', '.X.']` and returns a `Grid`. This makes fixtures legible. Live in `conway.spec.ts` (top of file) or `fixtures.ts`.

### `describe('step — Rule 1: underpopulation')`
- `it('AC-1: a single live cell on a 3×3 grid dies (zero neighbors)')` — covers AC-1.
- `it('a live cell with exactly 1 live neighbor dies')` — additional R1 coverage with a different neighbor count.

### `describe('step — Rule 2: survival')`
- `it('AC-2: a 2×2 block on a 3×3 grid is a still life across 5 generations')` — covers AC-2. Loop 5 times, assert each intermediate generation is byte-equal to the input.
- `it('a live cell with exactly 2 live neighbors survives')` — direct R2 coverage.
- `it('a live cell with exactly 3 live neighbors survives')` — direct R2 coverage (separate from reproduction R4).

### `describe('step — Rule 3: overpopulation')`
- `it('AC-4: a live cell with 4 live neighbors dies')` — covers AC-4.
- `it('a live cell with 5 live neighbors dies')` — additional R3 coverage.

### `describe('step — Rule 4: reproduction')`
- `it('a dead cell with exactly 3 live neighbors becomes alive')` — direct R4.
- `it('a dead cell with 2 live neighbors stays dead')` — R4 negative case.
- `it('a dead cell with 4 live neighbors stays dead')` — R4 negative case.

### `describe('step — canonical patterns')`
- `it('AC-3: horizontal blinker becomes vertical, then horizontal again (period 2)')` — covers AC-3. Apply `step` twice; assert generation 1 is the vertical orientation and generation 2 is byte-equal to the input.
- `it('AC-5: a glider on a 10×10 grid translates by (1,1) every 4 generations')` — covers AC-5. Apply `step` four times; assert the live-cell positions are the original positions shifted by `(+1, +1)`.

### `describe('step — determinism')`
- `it('AC-6: 100 independent runs on copies of the same input produce byte-identical outputs')` — covers AC-6. Construct a non-trivial input grid (e.g., a glider or a randomized fixed-seeded grid — but **not** randomized via `randomizeGrid`, which is Story 2.4; just hand-paint a few live cells). Run `step` 100 times on `cloneGrid` copies. Assert all output `cells` buffers compare equal.

### `describe('step — purity')`
- `it('does not mutate the input grid')` — explicit input-immutability check. Construct an input, snapshot `Array.from(input.cells)`, run `step`, assert `Array.from(input.cells)` equals the snapshot.
- `it('returns a new Grid object with a new cells buffer')` — reference identity check.

### `describe('step — performance smoke')`
- `it('AC-7: a 50×50 grid steps 100 times in well under 1 second')` — sanity-check the 10-second AC-7 budget. This is not a perf benchmark (NFR4 lives in `apps/web`), just a guardrail against a quadratic regression. Use `performance.now()` deltas or a simple wall-clock; tolerate generous slop.

---

## Dev notes

These execution rules apply to **every** story in Epic 2.

- **Pure functions only** — no `Date.now()`, no `Math.random()` directly inside any function (Story 2.4's `randomize` is the lone exception).
- **No mutation of inputs** — every function returns a new `Grid` with a freshly-allocated `Uint8Array`.
- **TypeScript strict** — no `any`, no `@ts-ignore` to silence the strict check. `noUncheckedIndexedAccess` is in effect; index reads on `cells` may need `?? 0` or explicit bounds checks.
- **Test framework: Jest 30**. Test files alongside source as `*.spec.ts`.
- **Coverage is not enforced** (the brief warns against coverage-padding). Quality of tests > number of tests.
- **Workspace scope** is `@cgol-scaffold/*`. The path alias for this lib is `@cgol-scaffold/sim`. Do not introduce relative cross-lib imports.
- **Boundaries**: `scope:sim` may depend ONLY on `scope:types`. `step` consumes `Grid` and `countNeighbors` from sibling modules within `libs/sim` — that is intra-lib, not cross-lib, and is fine.

### Algorithmic guidance (non-prescriptive — Dev picks the implementation shape)

A straightforward double-loop implementation is fine and meets all ACs at MVP grid sizes (≤ 100×100 — see project-context rule #17). Skeleton:

```typescript
export function step(grid: Grid): Grid {
  const { width, height, cells } = grid;
  const next = new Uint8Array(width * height); // exactly one allocation
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alive = cells[y * width + x] === 1;
      const n = countNeighbors(grid, x, y);
      // B3/S23: alive iff (alive && (n === 2 || n === 3)) || (!alive && n === 3)
      next[y * width + x] = (alive ? n === 2 || n === 3 : n === 3) ? 1 : 0;
    }
  }
  return { width, height, cells: next };
}
```

Do **not** pre-emptively optimize this with bit-packing, change-list tracking, or convolution tricks. NFR4 (50×50 @ 30 gen/sec) is met comfortably by the naive form. Optimization belongs in the Web Worker / OffscreenCanvas stretch tier (Epic 6), where the architectural pivot pays off.

### What NOT to do here

- **Do not** introduce a `RuleSet` interface or a `conwayRules` object. That is Story 8.1's deliverable.
- **Do not** export `step` from a deeper path like `@cgol-scaffold/sim/rules/conway`. The barrel `libs/sim/src/index.ts` is the only public surface.
- **Do not** add HighLife, Day & Night, Brian's Brain, or any other rule set. FR16 is stretch and lives in Epic 8.
- **Do not** add toroidal wrap-around as a "small ergonomic improvement." PRD excludes it from MVP. Off-grid is dead.
- **Do not** add edge cases (empty grid, single cell, 0×0, 1×1, all-alive 3×3 corners) here — those are Story 2.3's deliverable. This story owns the four rules and the three canonical patterns; that is the correct grain for one PR.
- **Do not** touch `apps/web` or `apps/web-e2e`. The web app wires `step` into its render loop in Story 3.3 (Epic 3).

### Cross-story coordination

- This story depends on Story 2.1 (`Grid`, `countNeighbors`).
- Story 2.3 depends on this story (it tests `step`'s edge cases without re-implementing it).
- Story 2.4 is independent of this story; can run in parallel if helpful.

---

## Definition of done

- [ ] `libs/sim/src/lib/rules/conway.ts` exists and exports `step(grid: Grid): Grid` per the locked signature.
- [ ] `libs/sim/src/lib/rules/conway.spec.ts` exists and contains the test plan above; `pnpm nx test sim` passes.
- [ ] `libs/sim/src/index.ts` re-exports `step` per the locked barrel snippet.
- [ ] `step` does not mutate its input (asserted by an explicit spec).
- [ ] `step` allocates exactly one new `Uint8Array` per call (verifiable by reading the implementation; no second-order spec needed).
- [ ] All 100 determinism runs produce byte-identical outputs (AC-6 spec passes).
- [ ] Jest suite for `libs/sim` completes in under 10 seconds (AC-7).
- [ ] `pnpm nx lint sim` passes — the `no-restricted-imports` rule from Story 2.1 catches no violations in `conway.ts`.
- [ ] No file outside `libs/sim/**` is modified by this story.
- [ ] PR is small, focused, and the commit subjects each summarize in one sentence.
- [ ] Sprint-status will be updated by the orchestrator (not by Dev as part of this story).

---

## Out of scope

- Edge cases for `step`: empty grid, single cell, all-alive 3×3, corners, 1×1, 0×0, negative coords — Story 2.3.
- `randomizeGrid` and the injectable RNG seam — Story 2.4.
- Named pattern data (`block`, `blinker`, `glider`, `gosperGliderGun` exports) and `placePattern` — Story 5.1 (stretch). The fixtures used in this story's specs are inlined, not exported.
- The `RuleSet` interface and HighLife — Story 8.1 (stretch).
- Web Worker / OffscreenCanvas optimization — Epic 6 (stretch).
- Wiring `step` into the Next.js app's simulation loop — Story 3.3.
- Any change to `apps/web`, `apps/web-e2e`, or other libs.

---

## Files expected to be created or modified

| File | Action |
| --- | --- |
| `libs/sim/src/lib/rules/conway.ts` | created — exports `step(grid: Grid): Grid` |
| `libs/sim/src/lib/rules/conway.spec.ts` | created — Jest spec per the test plan |
| `libs/sim/src/lib/rules/fixtures.ts` | optionally created — shared blinker/block/glider helpers if duplication appears |
| `libs/sim/src/index.ts` | modified — add `export { step } from './lib/rules/conway.js';` |

No other files in the workspace are touched.

---

## References

- `docs/planning-artifacts/epics.md` — Story 2.2 ACs (this file mirrors them verbatim)
- `docs/planning-artifacts/architecture.md` §5.1 (public API surface and invariants), §4.4 (flat `Uint8Array` grid), §8 (deliberate non-choices: no toroidal wrap)
- `docs/planning-artifacts/prd.md` FR10 (deterministic Conway rules + canonical patterns), NFR3 (pure-function sim, < 10s test suite), NFR4 (perf budget — informs the smoke test only)
- `docs/project-context.md` rules #4 (sim purity), #9 (`step` invariants), #10 (tests land with code, behavioral assertions over coverage), #17 (no toroidal wrap)
- `docs/implementation-artifacts/2-1-grid-types-and-primitives-with-tests.md` — the `Grid` type, `countNeighbors`, and the `no-restricted-imports` rule this story relies on
- Conway's Game of Life canonical patterns reference — https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life
