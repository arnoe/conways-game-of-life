---
story_id: 2.3
epic: 2
title: Edge-case and boundary tests for `step()`
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

# Story 2.3 — Edge-case and boundary tests for `step()`

**Status:** `ready-for-dev`
**Epic:** 2 — Pure simulation core (`libs/sim`)
**Priority:** MVP
**Effort:** S

---

## User story

**As** a developer of the simulation core,
**I want** explicit Jest coverage of edge cases the four rules don't visibly exercise,
**So that** the test suite constrains real behavior, not just the happy path.

---

## Acceptance criteria

Copied verbatim from `docs/planning-artifacts/epics.md` Story 2.3, with stable IDs added.

- **AC-1** — **Given** an empty grid (all cells dead), **when** `step()` is applied, **then** the result is still empty (no spontaneous life).

- **AC-2** — **Given** a 3×3 grid with all cells alive, **when** `step()` is applied, **then** the four corner cells die (each has 3 live neighbors, but rule 3 applies once neighbors include >3 — verify the actual expected output cell-by-cell against a hand-computed reference).

- **AC-3** — **Given** a live cell at the corner `(0, 0)` of a 5×5 grid with no other live cells, **when** `step()` is applied, **then** the cell dies (off-grid neighbors are treated as dead, so neighbor count is 0, rule 1).

- **AC-4** — **Given** a 1×1 grid with a single live cell, **when** `step()` is applied, **then** the cell dies (rule 1, no neighbors).

> **Story-2.3 scope clarification — additional edge cases beyond the epics ACs.** The epics file lists four ACs. Sprint-planning guidance from the SM identified five more edge cases worth covering here in the same PR (because they all live in the same `step.edge.spec.ts` file and would otherwise be split into a follow-up that the panel would read as coverage-padding). They are listed under **Test plan / Additional edge-case coverage** below and are part of this story's deliverable. They are not new ACs; they are spec items that strengthen the constraint on `step()`'s behavior.

---

## Locked technical decisions

This story is **mostly tests**, with at most a polish-grade tweak to `step()` if an edge case reveals a real bug. No new public API. No new exports. No changes to the public barrel `libs/sim/src/index.ts`.

### File layout

```
libs/sim/src/
  lib/
    rules/
      conway.ts                  # (from Story 2.2 — touched only if a bug surfaces)
      conway.spec.ts             # (from Story 2.2 — rule-by-rule + canonical patterns)
      step.edge.spec.ts          # NEW — this story's deliverable
      fixtures.ts                # (from Story 2.2 if it exists; otherwise skip)
```

The edge-case spec lives in its own file (`step.edge.spec.ts`) rather than appending to `conway.spec.ts`. Reasoning: `conway.spec.ts` is rule-organized (R1, R2, R3, R4, canonical patterns, determinism). Edge cases cut across rules and are organized by **input shape**, not by rule. Keeping them separate makes the file structure read cleanly to the panel.

### What "polish only if a bug surfaces" means

If, while writing the edge-case specs, Dev discovers that `step()` actually throws on a 0×0 grid, or returns a stale buffer when called twice on the same input, or trips on negative coordinates passed via a fixture — fix the implementation in this PR. Otherwise leave `libs/sim/src/lib/rules/conway.ts` and `libs/sim/src/lib/grid.ts` untouched.

If a bug **is** found, the fix lives in a separate commit on the same branch with a one-sentence subject like `Fix step() to return empty grid on 0x0 input`. Do not bundle the fix with the spec additions in a single commit — the spec additions are this story's primary commit.

### Determinism statistical bound (locked)

AC "Determinism: `step(step(grid))` always identical for identical input — run 100 times, identical output" overlaps with Story 2.2 AC-6 (which runs 100 determinism iterations on `step()`). To avoid duplicate tests, this story's determinism spec asserts a **stronger** invariant: `step(step(grid))` (two-generation determinism) is byte-identical across 100 runs on independent copies. Story 2.2 covered single-step determinism; this story covers compound-step determinism. The two specs together pin determinism at both grains.

---

## Test plan (Jest, in `libs/sim/src/lib/rules/step.edge.spec.ts`)

All specs use the public `step` import from `@cgol-scaffold/sim` (or the local relative import `'./conway.js'` — pick one and be consistent within the file; relative is fine for an intra-lib spec).

### `describe('step — empty and degenerate grids')`
- `it('AC-1: empty 5×5 grid stays empty after step')` — covers AC-1. Construct via `createGrid(5, 5)`; assert `step(grid).cells` is all-zero.
- `it('AC-1 (extended): empty grid stays empty across 10 generations')` — strengthens AC-1 against any "spontaneous life" regression.
- **AC-1+0×0**: `it('a 0×0 grid is unchanged by step (no throw, cells.length === 0)')` — degenerate empty grid.
- **AC-4**: `it('AC-4: a 1×1 grid with a single live cell dies in one step')` — covers AC-4.
- `it('AC-4 (extended): a 1×1 grid that is dead stays dead')` — degenerate live-or-dead 1×1 sanity.

### `describe('step — single-cell behavior')`
- `it('a single live cell anywhere on a 5×5 grid dies in one step (rule 1, zero neighbors)')` — generalizes AC-3 across multiple positions; loop over `(0,0)`, `(2,2)`, `(4,4)`, `(0,4)`, `(4,0)` and assert each dies.
- `it('AC-3: a live cell at corner (0,0) of a 5×5 dies (off-grid neighbors counted as dead)')` — covers AC-3 explicitly.

### `describe('step — all-alive 3×3 (corner / edge / center analysis)')`
- `it('AC-2: a 3×3 all-alive grid produces the hand-computed next generation')` — covers AC-2. Assert the output cell-by-cell. Hand-computed reference:
  - Corner cells `(0,0)`, `(2,0)`, `(0,2)`, `(2,2)`: each has 3 in-bounds live neighbors (off-grid neighbors are dead). Live with 3 neighbors → **survives** under R2.
  - Edge cells `(1,0)`, `(0,1)`, `(2,1)`, `(1,2)`: each has 5 in-bounds live neighbors. Live with 5 neighbors → **dies** under R3 (overpopulation).
  - Center cell `(1,1)`: has 8 live neighbors. Live with 8 → **dies** under R3.
  - Expected output: `['X.X', '...', 'X.X']` — corners alive, everything else dead.

  **Note for Dev:** the AC-2 phrasing in the epics file is slightly mis-stated ("the four corner cells die"). The hand-computed reference shows that on a 3×3 all-alive grid the corners actually **survive** (they have exactly 3 live neighbors, which is R2-survival, not R3-overpopulation). This story follows the **hand-computed reference**, not the AC-2 phrasing. The AC's instruction is to "verify the actual expected output cell-by-cell against a hand-computed reference," and the reference says corners survive. Asserting the verified-by-hand grid (`['X.X', '...', 'X.X']`) satisfies the AC's intent. Dev should leave a one-line spec comment explaining this so the panel doesn't re-read the AC and get confused.

### `describe('step — boundary patterns')`
- `it('a 2×2 block placed at the top-left corner of a 5×5 grid is a still life (corner stability)')` — verify boundary doesn't break the still-life invariant when the pattern abuts the grid edge. Apply `step` 5 times; assert each generation matches the input.
- `it('a 2×2 block placed at the bottom-right corner of a 5×5 grid is a still life')` — symmetric corner check.
- `it('a horizontal blinker at the top edge of a 5×5 grid still oscillates with period 2')` — boundary doesn't interfere with the canonical period-2 oscillator. Place `[(1,0),(2,0),(3,0)]` and assert generation 1 is the vertical orientation `[(2,-1) clipped, (2,0), (2,1)]` → expected: only cells fully in-bounds remain alive. Hand-compute the expected grid before writing the assertion.
- `it('a vertical blinker at the left edge of a 5×5 grid still oscillates with period 2')` — symmetric edge check.

### `describe('step — out-of-bounds reads do not throw')`
- `it('countNeighbors at (-1, -1) returns 0 (no throw)')` — sanity-check the `countNeighbors` boundary handling Story 2.1 ships. (Belongs in `grid.spec.ts` arguably, but it's the load-bearing helper for `step`'s boundary correctness; an explicit spec here makes the implication direct.)
- `it('countNeighbors at (width, height) returns 0 (no throw)')`.
- `it('step does not throw when the grid is fully empty, fully alive, 0×0, 1×1, or 1×N strip')` — generic "no throw" guardrail.

### `describe('step — compound-step determinism')`
- `it('step(step(grid)) is byte-identical across 100 runs on independent input copies')` — strengthens Story 2.2 AC-6 to two-generation depth. Construct a non-trivial fixture (e.g., glider on a 10×10), `cloneGrid` it 100 times, run `step(step(...))` on each, assert all 100 output `cells` buffers are byte-equal.

### Optional spec (do NOT add unless time permits)
- `it('1×N and N×1 strip grids: a single live cell on a 1×5 strip dies in one step')` — narrow-strip degenerate case. Add only if writing it costs < 5 minutes; otherwise skip. Not required by any AC.

---

## Dev notes

These execution rules apply to **every** story in Epic 2.

- **Pure functions only** — no `Date.now()`, no `Math.random()` directly inside any function (Story 2.4's `randomize` is the lone exception).
- **No mutation of inputs** — every function returns a new `Grid` with a freshly-allocated `Uint8Array`.
- **TypeScript strict** — no `any`, no `@ts-ignore` to silence the strict check.
- **Test framework: Jest 30**. Test files alongside source as `*.spec.ts`.
- **Coverage is not enforced** (the brief warns against coverage-padding). Quality of tests > number of tests.
- **Workspace scope** is `@cgol-scaffold/*`. The path alias for this lib is `@cgol-scaffold/sim`. Do not introduce relative cross-lib imports; intra-lib relative imports inside `libs/sim/src/lib/...` are fine.

### Why this story is mostly tests, not implementation

`step()` and the four rules already shipped in Story 2.2. The architecture's invariants (off-grid is dead, no mutation, exactly one new `Uint8Array` per call, no throw on degenerate input) imply that all of this story's edge cases should pass without code changes. If they don't, that's a real bug in `step()` — fix it. But do **not** speculatively touch `step()`'s implementation just because adding tests feels too small to be a "real PR." Tests are the deliverable. The brief explicitly values constraint-based test addition over implementation churn.

### What if an AC reveals a real bug?

If `step()` actually fails on a 0×0 grid, or throws on `1×1`, or has a subtle off-by-one in `countNeighbors` at boundaries — fix it in `libs/sim/src/lib/rules/conway.ts` or `libs/sim/src/lib/grid.ts`, in a **separate commit** on this branch with a one-sentence subject. The spec change and the implementation fix should be two commits, in either order, in the same PR. Do not amend Story 2.2's commits.

### What if Story 2.2's AC-2 hand-computed reference doesn't match the spec phrasing?

See the `describe('step — all-alive 3×3 ...')` note above. The epics AC-2 phrasing is slightly off; this story follows the hand-computed reference (corners survive on a 3×3 all-alive). Leave a one-line comment in the spec so the panel can verify the reasoning without re-reading the AC.

### Cross-story coordination

- This story depends on Story 2.2 (`step` exists and is exported).
- This story depends transitively on Story 2.1 (`Grid`, `createGrid`, `setCell`, `countNeighbors`).
- Story 2.4 is independent of this story.

---

## Definition of done

- [ ] `libs/sim/src/lib/rules/step.edge.spec.ts` exists and contains the test plan above.
- [ ] All ACs (AC-1 through AC-4) are covered by at least one passing spec each, with stable IDs in the spec descriptions for traceability (`AC-1: ...`, `AC-2: ...`, etc.).
- [ ] The additional edge cases from the **scope clarification** are covered by passing specs.
- [ ] `pnpm nx test sim` passes; the full sim suite still completes in under 10 seconds.
- [ ] `pnpm nx lint sim` passes.
- [ ] If any spec revealed a real bug in `step()` or `countNeighbors`, the fix lives in its own commit with a one-sentence subject.
- [ ] No file outside `libs/sim/**` is modified.
- [ ] No new public exports are added to `libs/sim/src/index.ts` (this is a tests-only story).
- [ ] PR is small, focused, and the commit subjects each summarize in one sentence.
- [ ] Sprint-status will be updated by the orchestrator (not by Dev as part of this story).

---

## Out of scope

- Adding any new public API to `libs/sim` (no new exports, no new types).
- `randomizeGrid` and the injectable RNG seam — Story 2.4.
- Named pattern data and `placePattern` — Story 5.1 (stretch).
- The `RuleSet` interface and HighLife — Story 8.1 (stretch).
- Wiring `step` into the Next.js app — Story 3.3.
- Performance benchmarking of `step()` — NFR4 verification lives in `apps/web` integration tests, not here.
- Any change to `apps/web`, `apps/web-e2e`, or other libs.

---

## Files expected to be created or modified

| File | Action |
| --- | --- |
| `libs/sim/src/lib/rules/step.edge.spec.ts` | created — Jest spec per the test plan |
| `libs/sim/src/lib/rules/conway.ts` | modified **only if** an edge-case spec reveals a real bug; otherwise untouched |
| `libs/sim/src/lib/grid.ts` | modified **only if** an edge-case spec reveals a real bug in `countNeighbors` or other primitives; otherwise untouched |

No other files in the workspace are touched. No changes to `libs/sim/src/index.ts` (tests-only story).

---

## References

- `docs/planning-artifacts/epics.md` — Story 2.3 ACs (this file mirrors them verbatim, with the AC-2 hand-computation clarification flagged in the test plan)
- `docs/planning-artifacts/architecture.md` §5.1 (sim invariants — off-grid is dead, no mutation, no throw on degenerate input), §8 (no toroidal wrap)
- `docs/planning-artifacts/prd.md` FR10 (deterministic Conway rules + edge cases), NFR3 (pure-function sim, < 10s test suite)
- `docs/project-context.md` rule #9 (`step` invariants), rule #10 (tests land with code, behavioral assertions over coverage), rule #17 (no toroidal wrap)
- `docs/implementation-artifacts/2-1-grid-types-and-primitives-with-tests.md` — `Grid`, `createGrid`, `setCell`, `countNeighbors`
- `docs/implementation-artifacts/2-2-conway-rules-engine-step-with-rule-by-rule-tests.md` — `step` and the canonical-pattern coverage this story complements
