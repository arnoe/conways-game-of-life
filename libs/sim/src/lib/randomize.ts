import type { Grid } from './types.js';

/**
 * Returns a NEW grid where each cell is independently alive with
 * probability `density`, computed from `rng()`. The input `grid` is read
 * for `width`/`height` only; its `cells` are never mutated.
 *
 * Behavior:
 * - A cell becomes alive iff `rng() < density`. One `rng()` call per cell,
 *   in row-major order — this ordering is the structural reason a seeded
 *   `rng` produces a deterministic byte-identical buffer (Story 2.4 AC-2).
 * - `density` is clamped to `[0, 1]`. Values < 0 are treated as 0, values
 *   > 1 are treated as 1. No throw.
 * - `width === 0` or `height === 0` returns an empty grid; the loop body
 *   simply doesn't execute. No throw.
 *
 * Purity discipline (project-context rule #4):
 * `Math.random` is the only non-deterministic function call permitted in
 * `libs/sim`, and only as the default value of the `rng` parameter here.
 * Tests pass a seeded `mulberry32` instance for byte-identical reproduction;
 * production callers fall through to `Math.random`.
 */
export function randomizeGrid(
  grid: Grid,
  density = 0.3,
  rng: () => number = Math.random,
): Grid {
  const d = density < 0 ? 0 : density > 1 ? 1 : density;
  const { width, height } = grid;
  const cells = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      cells[y * width + x] = rng() < d ? 1 : 0;
    }
  }
  return { width, height, cells };
}
