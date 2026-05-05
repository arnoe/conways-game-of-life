import { createGrid } from './grid.js';
import { randomizeGrid } from './randomize.js';

/**
 * Tiny seedable PRNG used by the deterministic specs below. Test-only —
 * never exported from the public barrel. Each call returns a value in
 * `[0, 1)` and the sequence is fully determined by `seed`.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('randomizeGrid — determinism (AC-2)', () => {
  it('AC-2: same seed → byte-identical grid (10×10), 1000 paired runs', () => {
    const input = createGrid(10, 10);
    for (let i = 0; i < 1000; i++) {
      const a = randomizeGrid(input, 0.5, mulberry32(42));
      const b = randomizeGrid(input, 0.5, mulberry32(42));
      expect(Array.from(a.cells)).toEqual(Array.from(b.cells));
    }
  });

  it('different seeds → different output grids', () => {
    const input = createGrid(10, 10);
    const a = randomizeGrid(input, 0.5, mulberry32(1));
    const b = randomizeGrid(input, 0.5, mulberry32(2));
    expect(Array.from(a.cells)).not.toEqual(Array.from(b.cells));
  });
});

describe('randomizeGrid — density approximation (AC-1)', () => {
  // Tolerance ±5% rationale: 100x100 = 10,000 cells; expected = density *
  // 10,000. With Bernoulli(p=0.3), σ ≈ sqrt(10000 * 0.3 * 0.7) ≈ 46. ±5%
  // (~500 cells around 3000) is ~10σ — far outside any reasonable tail.
  // The seeded value is deterministic; the band insulates against
  // mulberry32 micro-tweaks across Node versions, not statistical drift.
  it('AC-1: density 0.3 on a 100×100 grid yields a live count within ±5% of 3000 (seeded)', () => {
    const grid = randomizeGrid(createGrid(100, 100), 0.3, mulberry32(12345));
    const liveCount = grid.cells.reduce(
      (sum: number, c: number) => sum + c,
      0,
    );
    expect(liveCount).toBeGreaterThanOrEqual(2850);
    expect(liveCount).toBeLessThanOrEqual(3150);
  });

  it('density 0.5 on a 100×100 grid yields a live count within ±5% of 5000 (seeded)', () => {
    const grid = randomizeGrid(createGrid(100, 100), 0.5, mulberry32(67890));
    const liveCount = grid.cells.reduce(
      (sum: number, c: number) => sum + c,
      0,
    );
    expect(liveCount).toBeGreaterThanOrEqual(4750);
    expect(liveCount).toBeLessThanOrEqual(5250);
  });
});

describe('randomizeGrid — boundary densities (AC-3)', () => {
  it('AC-3: density 0 → all cells dead', () => {
    // rng returning 0.99 would normally produce alive only for density>0.99;
    // with density=0 the comparison `rng() < 0` is always false → all dead.
    const grid = randomizeGrid(createGrid(10, 10), 0, () => 0.99);
    expect(grid.cells.every((c) => c === 0)).toBe(true);
  });

  it('AC-3: density 1 → all cells alive', () => {
    // rng returning 0 is always less than 1 → all alive regardless of rng.
    const grid = randomizeGrid(createGrid(10, 10), 1, () => 0);
    expect(grid.cells.every((c) => c === 1)).toBe(true);
  });

  it('density < 0 is clamped to 0 (all dead)', () => {
    const grid = randomizeGrid(createGrid(10, 10), -0.5, () => 0);
    expect(grid.cells.every((c) => c === 0)).toBe(true);
  });

  it('density > 1 is clamped to 1 (all alive)', () => {
    const grid = randomizeGrid(createGrid(10, 10), 1.5, () => 0.99);
    expect(grid.cells.every((c) => c === 1)).toBe(true);
  });
});

describe('randomizeGrid — wrong/degenerate shape', () => {
  it('width 0 → empty grid, no throw', () => {
    const grid = randomizeGrid(createGrid(0, 5), 0.5, mulberry32(1));
    expect(grid.width).toBe(0);
    expect(grid.height).toBe(5);
    expect(grid.cells.length).toBe(0);
  });

  it('height 0 → empty grid, no throw', () => {
    const grid = randomizeGrid(createGrid(5, 0), 0.5, mulberry32(1));
    expect(grid.width).toBe(5);
    expect(grid.height).toBe(0);
    expect(grid.cells.length).toBe(0);
  });

  it('0×0 grid → empty grid, no throw', () => {
    const grid = randomizeGrid(createGrid(0, 0), 0.5, mulberry32(1));
    expect(grid.cells.length).toBe(0);
  });
});

describe('randomizeGrid — input immutability and shape preservation', () => {
  it('does not mutate the input grid', () => {
    const input = createGrid(5, 5);
    const snapshot = Array.from(input.cells);
    randomizeGrid(input, 0.5, mulberry32(1));
    expect(Array.from(input.cells)).toEqual(snapshot);
  });

  it('returns a new Grid object with a new cells buffer', () => {
    const input = createGrid(5, 5);
    const out = randomizeGrid(input, 0.5, mulberry32(1));
    expect(out).not.toBe(input);
    expect(out.cells).not.toBe(input.cells);
  });

  it('preserves the input grid dimensions', () => {
    const input = createGrid(7, 11);
    const out = randomizeGrid(input, 0.5, mulberry32(1));
    expect(out.width).toBe(7);
    expect(out.height).toBe(11);
    expect(out.cells.length).toBe(77);
  });
});

describe('randomizeGrid — default density (no explicit density arg)', () => {
  it('called with default density (0.3) produces ~30% live cells on 100×100 with a seeded rng', () => {
    // Pass `undefined` so the parameter default kicks in; supply a seeded
    // rng so the count is deterministic.
    const grid = randomizeGrid(createGrid(100, 100), undefined, mulberry32(54321));
    const liveCount = grid.cells.reduce(
      (sum: number, c: number) => sum + c,
      0,
    );
    expect(liveCount).toBeGreaterThanOrEqual(2850);
    expect(liveCount).toBeLessThanOrEqual(3150);
  });
});

describe('randomizeGrid — default RNG (no explicit rng arg)', () => {
  it('called without explicit rng, completes successfully and produces a Grid of the right shape', () => {
    const out = randomizeGrid(createGrid(10, 10));
    expect(out.width).toBe(10);
    expect(out.height).toBe(10);
    expect(out.cells.length).toBe(100);
    // Don't assert specific cells — Math.random is non-deterministic and
    // would be flaky on CI.
  });
});
