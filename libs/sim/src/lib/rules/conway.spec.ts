import { cloneGrid, createGrid, setCell } from '../grid.js';
import type { Cell, Grid } from '../types.js';
import { step } from './conway.js';

/**
 * Tiny fixture helper: takes a row-major ASCII description (dots = dead,
 * any other char = alive) and returns a `Grid`. Keeps hand-painted patterns
 * legible in the spec — `['.X.', 'XXX', '.X.']` reads like a printed grid.
 */
function gridFromRows(rows: readonly string[]): Grid {
  const height = rows.length;
  const width = height === 0 ? 0 : (rows[0]?.length ?? 0);
  const cells = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const row = rows[y] ?? '';
    if (row.length !== width) {
      throw new Error(
        `gridFromRows: row ${y} has length ${row.length}, expected ${width}`,
      );
    }
    for (let x = 0; x < width; x++) {
      const ch = row[x];
      cells[y * width + x] = ch === '.' || ch === ' ' ? 0 : 1;
    }
  }
  return { width, height, cells };
}

function expectGridEqual(actual: Grid, expected: Grid): void {
  expect(actual.width).toBe(expected.width);
  expect(actual.height).toBe(expected.height);
  expect(Array.from(actual.cells)).toEqual(Array.from(expected.cells));
}

/** Helper: paint a single live cell on a fresh grid. */
function withLive(grid: Grid, ...coords: ReadonlyArray<readonly [number, number]>): Grid {
  let g = grid;
  for (const [x, y] of coords) {
    g = setCell(g, x, y, 1 satisfies Cell);
  }
  return g;
}

describe('step — Rule 1: underpopulation', () => {
  it('AC-1: a single live cell on a 3×3 grid dies (zero neighbors)', () => {
    const input = withLive(createGrid(3, 3), [1, 1]);
    const out = step(input);
    expect(Array.from(out.cells)).toEqual(new Array(9).fill(0));
  });

  it('a live cell with exactly 1 live neighbor dies', () => {
    // Two adjacent live cells in isolation: each has 1 neighbor → both die.
    const input = gridFromRows([
      '.....',
      '.....',
      '..XX.',
      '.....',
      '.....',
    ]);
    const out = step(input);
    expect(Array.from(out.cells)).toEqual(new Array(25).fill(0));
  });
});

describe('step — Rule 2: survival', () => {
  it('AC-2: a 2×2 block on a 3×3 grid is a still life across 5 generations', () => {
    // Place block at top-left of a 4x4 so all four cells have exactly 3
    // live neighbors (the survival case).
    const input = gridFromRows([
      'XX..',
      'XX..',
      '....',
      '....',
    ]);
    let g = cloneGrid(input);
    for (let i = 0; i < 5; i++) {
      g = step(g);
      expectGridEqual(g, input);
    }
  });

  it('a live cell with exactly 2 live neighbors survives', () => {
    // Center of a horizontal blinker: the middle cell has 2 live neighbors
    // and survives in-place. We isolate this by checking the center cell
    // of `['XXX']` after one step still has the center live.
    const input = gridFromRows([
      '.....',
      '.....',
      '.XXX.',
      '.....',
      '.....',
    ]);
    const out = step(input);
    // Middle cell at (2,2): had 2 live neighbors, should survive.
    expect(out.cells[2 * 5 + 2]).toBe(1);
  });

  it('a live cell with exactly 3 live neighbors survives', () => {
    // Block: each cell has exactly 3 live neighbors and survives.
    const input = gridFromRows([
      'XX..',
      'XX..',
      '....',
      '....',
    ]);
    const out = step(input);
    // (0,0) had 3 live neighbors → still alive.
    expect(out.cells[0]).toBe(1);
  });
});

describe('step — Rule 3: overpopulation', () => {
  it('AC-4: a live cell with 4 live neighbors dies', () => {
    // Center of a "+" of 5 live cells has 4 live neighbors.
    //   . X .
    //   X X X
    //   . X .
    const input = gridFromRows([
      '.....',
      '..X..',
      '.XXX.',
      '..X..',
      '.....',
    ]);
    const out = step(input);
    // Center cell at (2,2): had 4 live neighbors → dies.
    expect(out.cells[2 * 5 + 2]).toBe(0);
  });

  it('a live cell with 5 live neighbors dies', () => {
    // All-alive 3x3 (interior of a 5x5): the center has 8 neighbors which is
    // >3; the edge cells of the all-alive 3x3 have 5 each. Use a 5x5 with
    // all-alive 3x3 in the middle.
    const input = gridFromRows([
      '.....',
      '.XXX.',
      '.XXX.',
      '.XXX.',
      '.....',
    ]);
    const out = step(input);
    // Edge cell at (2,1) of the all-alive 3x3 had 5 live neighbors → dies.
    expect(out.cells[1 * 5 + 2]).toBe(0);
  });
});

describe('step — Rule 4: reproduction', () => {
  it('a dead cell with exactly 3 live neighbors becomes alive', () => {
    // Cell at (2,2) is dead with 3 live neighbors at (1,1), (3,1), (2,3).
    const input = gridFromRows([
      '.....',
      '.X.X.',
      '.....',
      '..X..',
      '.....',
    ]);
    const out = step(input);
    expect(out.cells[2 * 5 + 2]).toBe(1);
  });

  it('a dead cell with 2 live neighbors stays dead', () => {
    const input = gridFromRows([
      '.....',
      '.....',
      '.X.X.',
      '.....',
      '.....',
    ]);
    const out = step(input);
    // Cell (2,2) was dead with 2 live neighbors → stays dead.
    expect(out.cells[2 * 5 + 2]).toBe(0);
  });

  it('a dead cell with 4 live neighbors stays dead', () => {
    // Cell at (2,2) dead, with 4 diagonal live neighbors.
    const input = gridFromRows([
      '.....',
      '.X.X.',
      '.....',
      '.X.X.',
      '.....',
    ]);
    const out = step(input);
    expect(out.cells[2 * 5 + 2]).toBe(0);
  });
});

describe('step — canonical patterns', () => {
  it('AC-3: horizontal blinker becomes vertical, then horizontal again (period 2)', () => {
    const horizontal = gridFromRows([
      '.....',
      '.....',
      '.XXX.',
      '.....',
      '.....',
    ]);
    const vertical = gridFromRows([
      '.....',
      '..X..',
      '..X..',
      '..X..',
      '.....',
    ]);
    const gen1 = step(horizontal);
    expectGridEqual(gen1, vertical);
    const gen2 = step(gen1);
    expectGridEqual(gen2, horizontal);
  });

  it('AC-5: a glider on a 10×10 grid translates by (1,1) every 4 generations', () => {
    // Canonical glider in its standard orientation, top-left corner at (1,1):
    //   . X .
    //   . . X
    //   X X X
    const start = gridFromRows([
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
    // After 4 generations the glider should have translated by (+1, +1):
    const expected = gridFromRows([
      '..........',
      '..........',
      '...X......',
      '....X.....',
      '..XXX.....',
      '..........',
      '..........',
      '..........',
      '..........',
      '..........',
    ]);
    let g = start;
    for (let i = 0; i < 4; i++) g = step(g);
    expectGridEqual(g, expected);
  });
});

describe('step — determinism', () => {
  it('AC-6: 100 independent runs on copies of the same input produce byte-identical outputs', () => {
    const input = gridFromRows([
      '..........',
      '..X.......',
      '...X......',
      '.XXX......',
      '..........',
      '..........',
      '..XX......',
      '..XX......',
      '..........',
      '..........',
    ]);
    const reference = step(cloneGrid(input));
    for (let i = 0; i < 100; i++) {
      const copy = cloneGrid(input);
      const out = step(copy);
      expect(Array.from(out.cells)).toEqual(Array.from(reference.cells));
    }
  });
});

describe('step — purity', () => {
  it('does not mutate the input grid', () => {
    const input = gridFromRows([
      '.....',
      '.XXX.',
      '.....',
    ]);
    const snapshot = Array.from(input.cells);
    step(input);
    expect(Array.from(input.cells)).toEqual(snapshot);
  });

  it('returns a new Grid object with a new cells buffer', () => {
    const input = gridFromRows(['.X.', 'XXX', '.X.']);
    const out = step(input);
    expect(out).not.toBe(input);
    expect(out.cells).not.toBe(input.cells);
  });
});

describe('step — performance smoke', () => {
  it('AC-7: a 50×50 grid steps 100 times in well under 1 second', () => {
    let g = createGrid(50, 50);
    // Sprinkle some life so step() does real work.
    for (let i = 0; i < 50; i++) {
      g = setCell(g, i % 50, (i * 7) % 50, 1);
    }
    const start = performance.now();
    for (let i = 0; i < 100; i++) g = step(g);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(1000);
  });
});
