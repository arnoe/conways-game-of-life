---
story_id: 2.4
epic: 2
title: Randomize with injectable RNG and tests
status: ready-for-dev
priority: MVP
estimated_effort: S
fr_nfr_coverage: [FR4, FR10, NFR3]
inputDocuments:
  - docs/planning-artifacts/epics.md
  - docs/planning-artifacts/architecture.md
  - docs/planning-artifacts/prd.md
  - docs/project-context.md
---

# Story 2.4 — Randomize with injectable RNG and tests

**Status:** `ready-for-dev`
**Epic:** 2 — Pure simulation core (`libs/sim`)
**Priority:** MVP
**Effort:** S

---

## User story

**As** a developer of the simulation core,
**I want** `randomizeGrid(grid, density?, rng?)` that accepts a seedable RNG,
**So that** production uses `Math.random` while tests use a deterministic seed for reproducibility.

---

## Acceptance criteria

Copied verbatim from `docs/planning-artifacts/epics.md` Story 2.4, with stable IDs added.

- **AC-1** — **Given** the function signature `randomizeGrid(grid, density = 0.3, rng = Math.random): Grid`, **when** called without arguments beyond `grid`, **then** each cell is independently alive with probability ~0.3 (verified statistically with a fixed seed in tests, not asserted on a single draw).

- **AC-2** — **Given** a deterministic seeded RNG (e.g., a tiny `mulberry32`), **when** `randomizeGrid` is called twice with the same seed and same dimensions, **then** the two output grids are byte-identical.

- **AC-3** — **Given** `density = 0` or `density = 1`, **when** `randomizeGrid` is called, **then** the grid is all-dead or all-alive respectively (boundary cases of the density parameter).

- **AC-4** — **Given** the spec lives at `libs/sim/src/lib/grid.spec.ts` (or sibling), **when** `pnpm nx test sim` runs, **then** all randomize-related assertions pass.

> **Story-2.4 scope clarification on AC-4 — spec file location.** The epics file says "or sibling," and Story 2.1 already filled `libs/sim/src/lib/grid.spec.ts` with the primitive specs. To keep `grid.spec.ts` focused on the seven primitives (and to stop it from sprawling), this story creates a sibling spec file `libs/sim/src/lib/randomize.spec.ts`. The "or sibling" wording in AC-4 explicitly permits this. AC-4 is satisfied by the new sibling file.

---

## Locked technical decisions

These are decisions Dev does **not** need to relitigate. Defer to architecture.md / project-context.md if anything below appears ambiguous; nothing should.

### Public function signature (architecture §5.1, project-context rule #11, locked verbatim)

```typescript
// libs/sim/src/lib/randomize.ts
export function randomizeGrid(
  grid: Grid,
  density?: number,    // default 0.3 (project-context rule #17)
  rng?: () => number,  // default Math.random (the lone Math.random reference in libs/sim)
): Grid;
```

**Behavior**:
- A cell becomes alive iff `rng() < density`.
- One `rng()` call per cell, in row-major order (`for y; for x`). Order matters for AC-2's byte-equality determinism: the same seed produces the same buffer only if cells are populated in a fixed order.
- Returns a new `Grid` with a freshly-allocated `Uint8Array`. Does **not** mutate the input `grid`.
- Inherits `width` and `height` from the input `grid`. (The signature takes a `Grid`, not raw dimensions, because the caller already has one — and this matches `clearGrid`/`cloneGrid`'s shape.)
- Density is **clamped** to `[0, 1]`: values `< 0` are treated as `0`, values `> 1` are treated as `1`. No throw. This makes AC-3's boundary cases robust against floating-point edge cases.
- For `width === 0` or `height === 0`, returns an empty `Grid` (zero-length `cells`). No throw. (See **Wrong-shape handling** in the test plan.)

> **Sprint-planning note on signature shape.** The SM guidance suggested `randomize(width, height, density, rng): Grid`. Architecture §5.1 and project-context rule #11 lock the signature as `randomizeGrid(grid, density?, rng?): Grid` — taking a `Grid` rather than raw `width`/`height`. This story follows the locked signature. Callers that have raw dimensions construct an empty grid first via `createGrid(w, h)` and pass it in. This is a one-line wrapper concern, not a design loss.

### `Math.random` discipline (project-context rule #4, architecture §5.7)

`randomizeGrid` is the **only** function in `libs/sim` that may reference `Math.random`, and only as the **default value** of the `rng` parameter. The reference is one identifier in the parameter list; nothing inside the function body calls `Math.random` directly. Every body-level random draw goes through the injected `rng` parameter. This means:

- The ESLint `no-restricted-globals` rule from Story 2.1 must not block `Math.random` (it currently bans `fetch`, `window`, `document` — verify it does **not** ban `Math.random`; if Story 2.1 added it to the list, add a per-line `// eslint-disable-next-line` only on the parameter default with a one-line justification comment).
- If ESLint rejects `Math.random` even at the parameter-default level, change the default to `undefined` and resolve at call site: `const draw = rng ?? Math.random;`. Either form satisfies the rule. Pick whichever lints cleanly.
- The `Math.random` reference is **not** a pure-function violation. The function is pure with respect to the `(grid, density, rng)` triple — given the same triple, it produces the same output. The non-determinism is the caller's choice via `rng`.

### `mulberry32` test helper (locked)

A 4-line seedable PRNG. Lives in the spec file (or `libs/sim/src/lib/__test_utils__/mulberry32.ts` if you prefer a sibling module — judgment call). Reference implementation:

```typescript
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

This is a test-only helper. Do not export it from the public barrel. Do not ship a "seeded" version of `randomizeGrid` from `libs/sim`. Tests construct seeded `rng` instances; production passes the implicit `Math.random` default.

### File layout

```
libs/sim/src/
  index.ts                       # public barrel — add `randomizeGrid` export
  lib/
    types.ts                     # (from Story 2.1)
    grid.ts                      # (from Story 2.1)
    grid.spec.ts                 # (from Story 2.1)
    randomize.ts                 # NEW — exports `randomizeGrid`
    randomize.spec.ts            # NEW — Jest spec per the test plan
    rules/                       # (from Stories 2.2, 2.3)
      conway.ts
      conway.spec.ts
      step.edge.spec.ts
```

### Public barrel update (locked)

```typescript
// libs/sim/src/index.ts — add `randomizeGrid` to the existing exports
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
export { randomizeGrid } from './lib/randomize.js';
```

---

## Test plan (Jest, in `libs/sim/src/lib/randomize.spec.ts`)

### `describe('randomizeGrid — determinism (AC-2)')`
- `it('AC-2: same seed → byte-identical grid (10×10), 1000 paired runs')` — covers AC-2. For 1000 iterations, build two seeded `mulberry32(42)` rngs, call `randomizeGrid` with each on a fresh 10×10 input, assert the output `cells` buffers are byte-equal. (1000 is the strong-form determinism count from the SM guidance; AC-2 says "twice" which is also satisfied by the same loop's first iteration. The 1000-run loop closes any "but does it stay deterministic across many calls?" concern.)
- `it('different seeds → different output grids (probabilistic but extremely likely)')` — sanity check that the seed actually influences output. Use seeds `1` and `2`; assert `cells` buffers are NOT byte-equal at density `0.5`. (Failure here would mean `mulberry32` is broken or `randomizeGrid` is ignoring `rng`.)

### `describe('randomizeGrid — density approximation (AC-1)')`
- `it('AC-1: density 0.3 on a 100×100 grid yields a live count within ±5% of expected (3000), seeded')` — covers AC-1.
  - Build a 100×100 input grid (10,000 cells).
  - Use `mulberry32(12345)` as the seeded rng.
  - Call `randomizeGrid(grid, 0.3, rng)`.
  - Count live cells: `expected = 10000 * 0.3 = 3000`.
  - Assert `liveCount` is within `[2850, 3150]` (±5%). The seeded run is reproducible, so this is a hard assertion, not a flaky probabilistic one.
  - **Tolerance choice rationale (document in a spec comment):** ±5% is generous given the variance of 10,000 Bernoulli(0.3) trials (1σ ≈ 46 cells, so ±5% ≈ 3.3σ — well outside any reasonable tail). With a fixed seed, the value is deterministic; the tolerance exists to insulate the spec from minor `mulberry32` implementation tweaks across Node versions, not from genuine statistical drift. If the seeded count happens to land outside ±5%, that's a bug in `randomizeGrid` (probably wrong density math), not in the test.
- `it('density 0.5 on a 100×100 grid yields a live count within ±5% of 5000 (seeded)')` — same shape, different density, exercises the midrange.

### `describe('randomizeGrid — boundary densities (AC-3)')`
- `it('AC-3: density 0 → all cells dead')` — covers AC-3. `randomizeGrid(grid, 0)` returns a grid where `cells` is all zeros, regardless of rng.
- `it('AC-3: density 1 → all cells alive')` — covers AC-3. `randomizeGrid(grid, 1)` returns a grid where `cells` is all ones, regardless of rng.
- `it('density < 0 is clamped to 0 (all dead)')` — clamping behavior; pass `-0.5`, assert all dead.
- `it('density > 1 is clamped to 1 (all alive)')` — clamping behavior; pass `1.5`, assert all alive.

### `describe('randomizeGrid — wrong/degenerate shape')`
- `it('width 0 → empty grid, no throw')` — call on `createGrid(0, 5)`, assert returned grid has `cells.length === 0` and `width === 0`.
- `it('height 0 → empty grid, no throw')` — call on `createGrid(5, 0)`, assert returned grid has `cells.length === 0`.
- `it('0×0 grid → empty grid, no throw')` — degenerate case.

### `describe('randomizeGrid — input immutability and shape preservation')`
- `it('does not mutate the input grid')` — snapshot `Array.from(input.cells)`; run `randomizeGrid`; assert `Array.from(input.cells)` equals the snapshot.
- `it('returns a new Grid object with a new cells buffer')` — reference-distinct check.
- `it('preserves the input grid dimensions')` — output `width` and `height` match input.

### `describe('randomizeGrid — default density (no explicit density arg)')`
- `it('called with default density (0.3 per project-context rule #17), produces ~30% live cells on 100×100 with a seeded rng')` — verifies the parameter default. Tolerance ±5% as above.

### `describe('randomizeGrid — default RNG (no explicit rng arg)')`
- `it('called without explicit rng, completes successfully and produces a Grid of the right shape')` — does NOT assert specific cells (default rng is `Math.random`, non-deterministic). Just smoke-tests that the default-rng path doesn't throw and returns a valid grid. **Do NOT assert live-count tolerance against `Math.random`** — that would be flaky on CI runners.

---

## Dev notes

These execution rules apply to **every** story in Epic 2.

- **Pure functions only** — no `Date.now()`. `Math.random` appears **only** as the default value of `randomizeGrid`'s `rng` parameter. No other function in `libs/sim` may reference it.
- **No mutation of inputs** — every function returns a new `Grid` with a freshly-allocated `Uint8Array`.
- **TypeScript strict** — no `any`, no `@ts-ignore` to silence the strict check.
- **Test framework: Jest 30**. Test files alongside source as `*.spec.ts`.
- **Coverage is not enforced** (the brief warns against coverage-padding). Quality of tests > number of tests.
- **Workspace scope** is `@cgol-scaffold/*`. The path alias for this lib is `@cgol-scaffold/sim`.
- **Boundaries**: `scope:sim` may depend ONLY on `scope:types`. Intra-lib relative imports inside `libs/sim/src/lib/...` are fine.

### Why a `Grid`-typed parameter, not `(width, height, ...)`

Architecture §5.1 locked `randomizeGrid(grid, density?, rng?): Grid` because:
1. It pairs cleanly with `clearGrid(grid): Grid` and `cloneGrid(grid): Grid` — same shape, same intuition.
2. Callers in `apps/web` already hold a `Grid` (the page reducer state); they don't want to be forced to destructure `width`/`height` to call this function.
3. It defers grid-creation policy (e.g., dimension validation) to `createGrid`, the single place that already owns it.

This is settled. Do not relitigate.

### Algorithmic guidance (non-prescriptive)

```typescript
import type { Grid } from './types.js';

export function randomizeGrid(
  grid: Grid,
  density: number = 0.3,
  rng: () => number = Math.random,
): Grid {
  const d = density < 0 ? 0 : density > 1 ? 1 : density; // clamp
  const { width, height } = grid;
  const cells = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      cells[y * width + x] = rng() < d ? 1 : 0;
    }
  }
  return { width, height, cells };
}
```

Note the row-major iteration order — same as `step()` and `createGrid`'s mental model. AC-2's byte-equality determinism depends on this ordering being stable.

### What NOT to do here

- **Do not** export `mulberry32` or any seeded PRNG from the public barrel. The PRNG is a test concern.
- **Do not** add a separate `randomizeSeeded(grid, seed)` convenience function. Callers that want deterministic randomness construct their own `mulberry32(seed)` and pass it as `rng`. One function, two callers (production + tests).
- **Do not** validate density bounds with a `RangeError` throw — clamp to `[0, 1]` per the locked behavior. AC-3's boundary cases work cleanly with clamping; throwing would reject the density-edge cases the spec exercises.
- **Do not** pre-allocate via `new Uint8Array(0)` for the empty-grid case and special-case it. The general loop handles `width === 0` and `height === 0` correctly because the inner loop body never executes. Keep the implementation single-form.
- **Do not** add a per-bit packing optimization. NFR4 perf budget is 50×50 at 30 gen/sec; `randomizeGrid` is called on user-driven button presses, not in the simulation loop. Naive byte-per-cell is fine.

### Cross-story coordination

- This story depends on Story 2.1 (`Grid`, `createGrid`).
- This story is **independent** of Stories 2.2 and 2.3. It can run in parallel with them. The default sequencing is 2.1 → 2.2 → 2.3 → 2.4 (linear), but if Dev wants to parallelize the build, 2.4 can branch off 2.1 directly.
- Story 3.4 (Clear and Randomize controls in the web app) consumes `randomizeGrid` from this story. That's an Epic 3 dependency, not an Epic 2 internal one.

---

## Definition of done

- [ ] `libs/sim/src/lib/randomize.ts` exists and exports `randomizeGrid` per the locked signature.
- [ ] `libs/sim/src/lib/randomize.spec.ts` exists and contains the test plan above; `pnpm nx test sim` passes.
- [ ] `libs/sim/src/index.ts` re-exports `randomizeGrid` per the locked barrel snippet.
- [ ] `randomizeGrid` does not mutate its input (asserted by spec).
- [ ] AC-2 determinism spec passes for 1000 paired runs.
- [ ] AC-1 density approximation spec passes (live count within ±5% of expected on a 100×100 grid with `mulberry32(12345)`).
- [ ] AC-3 boundary cases pass: density 0 → all dead, density 1 → all alive.
- [ ] Wrong-shape cases pass: width 0, height 0, 0×0 → empty grid, no throw.
- [ ] `Math.random` appears in the codebase **only** as the default value of `randomizeGrid`'s `rng` parameter. Verifiable via `grep -r "Math.random" libs/sim/src/` returning exactly one match (or two, if linting forced the alternate `?? Math.random` form at the call site within the same function).
- [ ] `pnpm nx lint sim` passes; `pnpm nx test sim` passes; `pnpm nx run-many -t lint,test` passes workspace-wide.
- [ ] No file outside `libs/sim/**` is modified.
- [ ] PR is small, focused, and the commit subjects each summarize in one sentence.
- [ ] Sprint-status will be updated by the orchestrator (not by Dev as part of this story).

---

## Out of scope

- Wiring `randomizeGrid` into the Next.js app's "Randomize" button — Story 3.4.
- Exporting `mulberry32` or any seeded PRNG from `libs/sim` — test-internal helper only.
- Custom density UI (slider) in the web app — out of PRD scope; the locked default is 0.3 per project-context rule #17.
- The `RuleSet` interface and HighLife — Story 8.1 (stretch).
- Named patterns and `placePattern` — Story 5.1 (stretch).
- Any change to `apps/web`, `apps/web-e2e`, or other libs.

---

## Files expected to be created or modified

| File | Action |
| --- | --- |
| `libs/sim/src/lib/randomize.ts` | created — exports `randomizeGrid(grid, density?, rng?): Grid` |
| `libs/sim/src/lib/randomize.spec.ts` | created — Jest spec per the test plan; includes the local `mulberry32` helper |
| `libs/sim/src/index.ts` | modified — add `export { randomizeGrid } from './lib/randomize.js';` |
| `libs/sim/eslint.config.mjs` | modified **only if** Story 2.1's `no-restricted-globals` rule blocks `Math.random` at the parameter-default level; the simplest fix is the `?? Math.random` body-level form, which sidesteps the rule entirely without config changes |

No other files in the workspace are touched.

---

## References

- `docs/planning-artifacts/epics.md` — Story 2.4 ACs (this file mirrors them verbatim, with the spec-file-location clarification flagged in the AC section)
- `docs/planning-artifacts/architecture.md` §5.1 (public API surface — `randomizeGrid(grid, density?, rng?)`), §5.7 (determinism & RNG discipline)
- `docs/planning-artifacts/prd.md` FR4 (randomize control + ~0.3 default density), FR10 (deterministic Conway sim — randomize is the one place global state would otherwise leak in), NFR3 (pure-function sim core)
- `docs/project-context.md` rules #4 (sim purity — `Math.random` only via injectable RNG), #11 (`randomizeGrid` signature + seeded `mulberry32` for tests), #17 (default density 0.3)
- `docs/implementation-artifacts/2-1-grid-types-and-primitives-with-tests.md` — `Grid`, `createGrid`, the `no-restricted-globals` ESLint rule whose `Math.random` interaction this story flags
