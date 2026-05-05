/**
 * Public type surface for the Conway's Game of Life simulation core.
 *
 * The simulation grid is stored as a flat `Uint8Array` of length `width * height`
 * in row-major order (`index === y * width + x`). A cell value of `1` is alive,
 * `0` is dead. All public types use `readonly` to express the immutability
 * invariant the rest of `libs/sim` enforces.
 *
 * NOTE: per Story 2.1's scope clarification, these types live here in
 * `libs/sim/src/lib/types.ts` until the dedicated `libs/types` lib lands.
 * The public surface from `@cgol-scaffold/sim` is unchanged when that move
 * happens; it is a search-and-replace.
 */

export interface Grid {
  readonly width: number;
  readonly height: number;
  /** length === width * height; 1 = alive, 0 = dead */
  readonly cells: Uint8Array;
}

/** A grid coordinate. Convenience tuple alias used by patterns/tests. */
export type Coord = readonly [number, number];

/** Cell value type — narrowed numeric so callers don't pass arbitrary numbers. */
export type Cell = 0 | 1;
