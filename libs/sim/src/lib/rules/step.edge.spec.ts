import {
  cloneGrid,
  countNeighbors,
  createGrid,
  setCell,
} from '../grid.js';
import type { Grid } from '../types.js';
import { step } from './conway.js';

/**
 * Edge-case and boundary tests for `step()` (Story 2.3).
 *
 * `conway.spec.ts` (Story 2.2) is rule-organized (R1–R4 + canonical patterns).
 * This file is **input-shape**-organized: empty / degenerate grids, single
 * cells, all-alive 3x3 (a hand-computed corner/edge/center analysis),
 * boundary patterns, and OOB reads. The two specs together pin both
 * "the rules" and "the shapes" without overlap.
 */

function gridFromRows(rows: readonly string[]): Grid {
  const height = rows.length;
  const width = height === 0 ? 0 : (rows[0]?.length ?? 0);
  const cells = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const row = rows[y] ?? '';
    for (let x = 0; x < width; x++) {
      cells[y * width + x] = row[x] === '.' || row[x] === ' ' ? 0 : 1;
    }
  }
  return { width, height, cells };
}

function expectGridEqual(actual: Grid, expected: Grid): void {
  expect(actual.width).toBe(expected.width);
  expect(actual.height).toBe(expected.height);
  expect(Array.from(actual.cells)).toEqual(Array.from(expected.cells));
}

describe('step — empty and degenerate grids', () => {
  it('AC-1: empty 5×5 grid stays empty after step', () => {
    const empty = createGrid(5, 5);
    const out = step(empty);
    expect(Array.from(out.cells)).toEqual(new Array(25).fill(0));
  });

  it('AC-1 (extended): empty grid stays empty across 10 generations', () => {
    let g = createGrid(5, 5);
    for (let i = 0; i < 10; i++) {
      g = step(g);
      expect(Array.from(g.cells)).toEqual(new Array(25).fill(0));
    }
  });

  it('a 0×0 grid is unchanged by step (no throw, cells.length === 0)', () => {
    const empty = createGrid(0, 0);
    const out = step(empty);
    expect(out.width).toBe(0);
    expect(out.height).toBe(0);
    expect(out.cells.length).toBe(0);
  });

  it('AC-4: a 1×1 grid with a single live cell dies in one step', () => {
    const alive = setCell(createGrid(1, 1), 0, 0, 1);
    const out = step(alive);
    expect(out.cells[0]).toBe(0);
  });

  it('AC-4 (extended): a 1×1 grid that is dead stays dead', () => {
    const dead = createGrid(1, 1);
    const out = step(dead);
    expect(out.cells[0]).toBe(0);
  });
});

describe('step — single-cell behavior', () => {
  it('a single live cell anywhere on a 5×5 grid dies in one step (rule 1, zero neighbors)', () => {
    const positions: ReadonlyArray<readonly [number, number]> = [
      [0, 0],
      [2, 2],
      [4, 4],
      [0, 4],
      [4, 0],
    ];
    for (const [x, y] of positions) {
      const input = setCell(createGrid(5, 5), x, y, 1);
      const out = step(input);
      expect(Array.from(out.cells)).toEqual(new Array(25).fill(0));
    }
  });

  it('AC-3: a live cell at corner (0,0) of a 5×5 dies (off-grid neighbors counted as dead)', () => {
    const input = setCell(createGrid(5, 5), 0, 0, 1);
    const out = step(input);
    expect(out.cells[0]).toBe(0);
    expect(Array.from(out.cells)).toEqual(new Array(25).fill(0));
  });
});

describe('step — all-alive 3×3 (corner / edge / center analysis)', () => {
  // NOTE: epics AC-2 phrasing ("the four corner cells die") is slightly
  // mis-stated. Hand-computation says the corners SURVIVE: each corner of
  // an all-alive 3x3 has exactly 3 in-bounds live neighbors (off-grid is
  // dead), which is rule R2 (survival), not R3 (overpopulation). The edges
  // (5 neighbors each) and center (8 neighbors) die under R3. The
  // hand-computed expected grid is `['X.X', '...', 'X.X']`.
  it('AC-2: a 3×3 all-alive grid produces the hand-computed next generation', () => {
    const input = gridFromRows(['XXX', 'XXX', 'XXX']);
    const expected = gridFromRows(['X.X', '...', 'X.X']);
    const out = step(input);
    expectGridEqual(out, expected);
  });
});

describe('step — boundary patterns', () => {
  it('a 2×2 block placed at the top-left corner of a 5×5 grid is a still life (corner stability)', () => {
    const input = gridFromRows([
      'XX...',
      'XX...',
      '.....',
      '.....',
      '.....',
    ]);
    let g = cloneGrid(input);
    for (let i = 0; i < 5; i++) {
      g = step(g);
      expectGridEqual(g, input);
    }
  });

  it('a 2×2 block placed at the bottom-right corner of a 5×5 grid is a still life', () => {
    const input = gridFromRows([
      '.....',
      '.....',
      '.....',
      '...XX',
      '...XX',
    ]);
    let g = cloneGrid(input);
    for (let i = 0; i < 5; i++) {
      g = step(g);
      expectGridEqual(g, input);
    }
  });

  it('a horizontal blinker at the top edge of a 5×5 grid produces the clipped vertical orientation', () => {
    // Place horizontal blinker at y=0: cells (1,0), (2,0), (3,0).
    // After step(), the canonical vertical blinker would live at (2,-1),
    // (2,0), (2,1). Clipping (2,-1) to off-grid leaves (2,0) and (2,1)
    // alive. Hand-computed expected grid:
    const input = gridFromRows([
      '.XXX.',
      '.....',
      '.....',
      '.....',
      '.....',
    ]);
    const expected = gridFromRows([
      '..X..',
      '..X..',
      '.....',
      '.....',
      '.....',
    ]);
    expectGridEqual(step(input), expected);
  });

  it('a vertical blinker at the left edge of a 5×5 grid produces the clipped horizontal orientation', () => {
    // Place vertical blinker at x=0: cells (0,1), (0,2), (0,3).
    // After step(), the canonical horizontal would live at (-1,2), (0,2),
    // (1,2). Clipping (-1,2) leaves (0,2) and (1,2) alive.
    const input = gridFromRows([
      '.....',
      'X....',
      'X....',
      'X....',
      '.....',
    ]);
    const expected = gridFromRows([
      '.....',
      '.....',
      'XX...',
      '.....',
      '.....',
    ]);
    expectGridEqual(step(input), expected);
  });
});

describe('step — out-of-bounds reads do not throw', () => {
  it('countNeighbors at (-1, -1) on an empty grid returns 0 (no throw)', () => {
    const g = createGrid(3, 3);
    expect(countNeighbors(g, -1, -1)).toBe(0);
  });

  it('countNeighbors at (width, height) on an empty grid returns 0 (no throw)', () => {
    const g = createGrid(3, 3);
    expect(countNeighbors(g, 3, 3)).toBe(0);
  });

  it('countNeighbors at far-OOB on a fully-alive grid still returns 0 (no in-bounds neighbors)', () => {
    const g = gridFromRows(['XXX', 'XXX', 'XXX']);
    expect(countNeighbors(g, -10, -10)).toBe(0);
    expect(countNeighbors(g, 100, 100)).toBe(0);
  });

  it('step does not throw when the grid is fully empty, fully alive, 0×0, 1×1, or 1×N strip', () => {
    expect(() => step(createGrid(5, 5))).not.toThrow();
    expect(() =>
      step(gridFromRows(['XXX', 'XXX', 'XXX'])),
    ).not.toThrow();
    expect(() => step(createGrid(0, 0))).not.toThrow();
    expect(() => step(createGrid(1, 1))).not.toThrow();
    expect(() => step(createGrid(5, 1))).not.toThrow();
    expect(() => step(createGrid(1, 5))).not.toThrow();
  });
});

describe('step — compound-step determinism', () => {
  it('step(step(grid)) is byte-identical across 100 runs on independent input copies', () => {
    // Glider on a 10x10. Compound step exercises two generations of
    // determinism, complementing Story 2.2 AC-6 (single-step determinism).
    const input = gridFromRows([
      '..........',
      '..X.......',
      '...X......',
      '.XXX......',
      '..........',
      '..........',
      '..........',
      '..........',
      '..........',
      '..........',
    ]);
    const reference = step(step(cloneGrid(input)));
    for (let i = 0; i < 100; i++) {
      const out = step(step(cloneGrid(input)));
      expect(Array.from(out.cells)).toEqual(Array.from(reference.cells));
    }
  });
});
