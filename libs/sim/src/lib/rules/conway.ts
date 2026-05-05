import { countNeighbors } from '../grid.js';
import type { Grid } from '../types.js';

/**
 * Pure Conway's Game of Life rules engine.
 *
 * Hardwired B3/S23 (per Story 2.2): a dead cell with exactly 3 live
 * neighbors becomes alive; a live cell with 2 or 3 live neighbors stays
 * alive; all other cells die. The {@link RuleSet} abstraction is
 * intentionally deferred to Story 8.1; do not parameterize this function.
 *
 * Invariants (architecture §5.1, project-context rule #9):
 * - Pure. No `Date.now`, no `Math.random`, no I/O, no globals.
 * - Allocates exactly one new `Uint8Array` per call (the output buffer).
 *   Does not mutate the input `grid.cells`.
 * - Off-grid neighbors are dead — no toroidal wrap. PRD MVP excludes wrap.
 * - Empty grids (`width === 0` or `height === 0`) are returned as-shape
 *   empty grids without throwing.
 */
export function step(grid: Grid): Grid {
  const { width, height, cells } = grid;
  const next = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const alive = cells[idx] === 1;
      const n = countNeighbors(grid, x, y);
      // B3/S23:
      //   alive iff (alive && (n === 2 || n === 3)) || (!alive && n === 3)
      const willLive = alive ? n === 2 || n === 3 : n === 3;
      next[idx] = willLive ? 1 : 0;
    }
  }
  return { width, height, cells: next };
}
