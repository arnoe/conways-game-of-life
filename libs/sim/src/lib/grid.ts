import type { Cell, Grid } from './types.js';

/**
 * Pure grid primitives for the Conway's Game of Life simulation core.
 *
 * Invariants (architecture §5.1, project-context rules #4, #8, #9):
 * - Pure functions only. No `Date.now`, no `Math.random`, no I/O, no globals.
 * - Every helper that "modifies" a grid returns a NEW {@link Grid} with a
 *   freshly-allocated `Uint8Array`. The input `grid.cells` is never mutated.
 * - Off-grid reads return 0 (dead) — no throw. This includes negative
 *   coordinates and coordinates >= width/height.
 * - {@link createGrid} accepts `0` dimensions (returns an empty grid) but
 *   throws `RangeError` on negative dimensions or on `width * height`
 *   overflowing the safe-integer range.
 */

/**
 * Returns a fresh {@link Grid} of the given dimensions, all cells dead (0).
 *
 * @throws RangeError on negative dimensions or unsafe `width * height`.
 */
export function createGrid(width: number, height: number): Grid {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 0 ||
    height < 0
  ) {
    throw new RangeError(
      `createGrid: width and height must be non-negative integers (got ${width}, ${height}).`,
    );
  }
  const length = width * height;
  if (!Number.isSafeInteger(length)) {
    throw new RangeError(
      `createGrid: width * height (${width} * ${height}) exceeds safe integer range.`,
    );
  }
  return { width, height, cells: new Uint8Array(length) };
}

/**
 * Returns a deep copy of `grid` with an independent `Uint8Array` buffer.
 * Mutating the clone's `cells` will not affect the original.
 */
export function cloneGrid(grid: Grid): Grid {
  return {
    width: grid.width,
    height: grid.height,
    cells: new Uint8Array(grid.cells),
  };
}

/**
 * Returns the cell value at `(x, y)`. Returns `0` for any out-of-bounds
 * coordinate (off-grid is dead — FR10). Never throws.
 */
export function getCell(grid: Grid, x: number, y: number): Cell {
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) {
    return 0;
  }
  const value = grid.cells[y * grid.width + x] ?? 0;
  return value === 1 ? 1 : 0;
}

/**
 * Returns a NEW grid with the cell at `(x, y)` set to `alive`.
 * Out-of-bounds coordinates are a no-op: returns a clone of the original
 * grid (still a fresh buffer, to keep the immutability contract uniform).
 * Never throws, never mutates the input.
 */
export function setCell(grid: Grid, x: number, y: number, alive: Cell): Grid {
  const next = cloneGrid(grid);
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) {
    return next;
  }
  next.cells[y * grid.width + x] = alive;
  return next;
}

/**
 * Returns a NEW grid with the cell at `(x, y)` flipped (0 -> 1, 1 -> 0).
 * Out-of-bounds coordinates are a no-op (returns a clone). Never throws.
 *
 * Toggling twice is the identity: `toggleCell(toggleCell(g, x, y), x, y)`
 * has the same `cells` as `g`.
 */
export function toggleCell(grid: Grid, x: number, y: number): Grid {
  const next = cloneGrid(grid);
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) {
    return next;
  }
  const idx = y * grid.width + x;
  next.cells[idx] = next.cells[idx] === 1 ? 0 : 1;
  return next;
}

/**
 * Returns a NEW grid with every cell set to dead (0). The dimensions are
 * preserved; only the buffer is freshly allocated and zero-filled.
 */
export function clearGrid(grid: Grid): Grid {
  return {
    width: grid.width,
    height: grid.height,
    cells: new Uint8Array(grid.width * grid.height),
  };
}

/**
 * Counts the live cells in the eight Moore-neighborhood positions around
 * `(x, y)`. Off-grid neighbors are counted as dead (no toroidal wrap).
 *
 * Returns a value in `[0, 8]`. Never throws — out-of-bounds query points
 * are valid and simply count whatever in-bounds neighbors they have.
 */
export function countNeighbors(grid: Grid, x: number, y: number): number {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= grid.width || ny >= grid.height) continue;
      if (grid.cells[ny * grid.width + nx] === 1) count++;
    }
  }
  return count;
}
