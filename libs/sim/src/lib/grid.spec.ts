import {
  clearGrid,
  cloneGrid,
  countNeighbors,
  createGrid,
  getCell,
  setCell,
  toggleCell,
} from './grid.js';
import type { Grid } from './types.js';

/**
 * Builds a 3x3 all-alive grid for the boundary tests on countNeighbors.
 * Hand-rolled so the test reads as "alive everywhere; count stays in-bounds."
 */
function allAlive3x3(): Grid {
  return {
    width: 3,
    height: 3,
    cells: new Uint8Array([1, 1, 1, 1, 1, 1, 1, 1, 1]),
  };
}

describe('createGrid', () => {
  it('produces cells.length === w*h all-zero for 5×5', () => {
    const g = createGrid(5, 5);
    expect(g.width).toBe(5);
    expect(g.height).toBe(5);
    expect(g.cells.length).toBe(25);
    expect(g.cells.every((c) => c === 0)).toBe(true);
  });

  it('produces cells.length === 0 for 0×0 (degenerate, no throw)', () => {
    const g = createGrid(0, 0);
    expect(g.width).toBe(0);
    expect(g.height).toBe(0);
    expect(g.cells.length).toBe(0);
  });

  it('throws RangeError on negative dimensions', () => {
    expect(() => createGrid(-1, 5)).toThrow(RangeError);
    expect(() => createGrid(5, -1)).toThrow(RangeError);
    expect(() => createGrid(-1, -1)).toThrow(RangeError);
  });
});

describe('getCell', () => {
  it('returns 0 for default-empty grid at any in-bounds coord', () => {
    const g = createGrid(3, 3);
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        expect(getCell(g, x, y)).toBe(0);
      }
    }
  });

  it('returns 0 for negative x or y (off-grid is dead)', () => {
    const g = allAlive3x3();
    expect(getCell(g, -1, 0)).toBe(0);
    expect(getCell(g, 0, -1)).toBe(0);
    expect(getCell(g, -5, -5)).toBe(0);
  });

  it('returns 0 for x >= width or y >= height (off-grid is dead)', () => {
    const g = allAlive3x3();
    expect(getCell(g, 3, 0)).toBe(0);
    expect(getCell(g, 0, 3)).toBe(0);
    expect(getCell(g, 100, 100)).toBe(0);
  });

  it('returns 1 after setCell at the same coord', () => {
    const g = setCell(createGrid(3, 3), 1, 1, 1);
    expect(getCell(g, 1, 1)).toBe(1);
  });
});

describe('setCell', () => {
  it('flips exactly the indexed cell, not its neighbors', () => {
    const g = setCell(createGrid(3, 3), 1, 1, 1);
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        expect(getCell(g, x, y)).toBe(x === 1 && y === 1 ? 1 : 0);
      }
    }
  });

  it('returns a new Grid with a new cells reference (immutability)', () => {
    const original = createGrid(3, 3);
    const next = setCell(original, 1, 1, 1);
    expect(next).not.toBe(original);
    expect(next.cells).not.toBe(original.cells);
  });

  it('does not mutate the original grid', () => {
    const original = createGrid(3, 3);
    const snapshot = Array.from(original.cells);
    setCell(original, 1, 1, 1);
    expect(Array.from(original.cells)).toEqual(snapshot);
  });

  it('is a no-op when x or y is out of bounds (returns equivalent grid, no throw)', () => {
    const original = setCell(createGrid(3, 3), 1, 1, 1);
    const snapshot = Array.from(original.cells);
    const oob = setCell(original, -1, 0, 1);
    expect(Array.from(oob.cells)).toEqual(snapshot);
    expect(oob.cells).not.toBe(original.cells);

    const oob2 = setCell(original, 3, 0, 1);
    expect(Array.from(oob2.cells)).toEqual(snapshot);
  });
});

describe('toggleCell', () => {
  it('is its own inverse: toggle twice === identity', () => {
    const g = setCell(createGrid(3, 3), 1, 1, 1);
    const twice = toggleCell(toggleCell(g, 0, 0), 0, 0);
    expect(Array.from(twice.cells)).toEqual(Array.from(g.cells));
  });

  it('does not mutate the original grid', () => {
    const original = setCell(createGrid(3, 3), 0, 0, 1);
    const snapshot = Array.from(original.cells);
    toggleCell(original, 0, 0);
    expect(Array.from(original.cells)).toEqual(snapshot);
  });
});

describe('clearGrid', () => {
  it('zeroes every cell in a non-empty grid', () => {
    let g = createGrid(3, 3);
    g = setCell(g, 0, 0, 1);
    g = setCell(g, 1, 1, 1);
    g = setCell(g, 2, 2, 1);
    const cleared = clearGrid(g);
    expect(cleared.cells.every((c) => c === 0)).toBe(true);
    expect(cleared.width).toBe(3);
    expect(cleared.height).toBe(3);
  });

  it('returns a new Grid (immutability)', () => {
    const g = setCell(createGrid(3, 3), 0, 0, 1);
    const cleared = clearGrid(g);
    expect(cleared).not.toBe(g);
    expect(cleared.cells).not.toBe(g.cells);
    // original is untouched
    expect(getCell(g, 0, 0)).toBe(1);
  });

  it('returns an equivalent grid when input is already all-zero', () => {
    const g = createGrid(3, 3);
    const cleared = clearGrid(g);
    expect(Array.from(cleared.cells)).toEqual(Array.from(g.cells));
  });
});

describe('cloneGrid', () => {
  it('returns a deep-equal but reference-distinct grid', () => {
    const g = setCell(createGrid(3, 3), 1, 1, 1);
    const c = cloneGrid(g);
    expect(c).not.toBe(g);
    expect(c.cells).not.toBe(g.cells);
    expect(c.width).toBe(g.width);
    expect(c.height).toBe(g.height);
    expect(Array.from(c.cells)).toEqual(Array.from(g.cells));
  });

  it('cloned grid mutations would not affect the original (independent buffers)', () => {
    const g = createGrid(3, 3);
    const c = cloneGrid(g);
    // The clone is an independent buffer; mutating it directly is not
    // something the public API allows, but the test verifies the buffer
    // is not a view over the original.
    c.cells[0] = 1;
    expect(g.cells[0]).toBe(0);
  });
});

describe('countNeighbors', () => {
  it('returns 0 for an empty 3×3 grid at center (1,1)', () => {
    expect(countNeighbors(createGrid(3, 3), 1, 1)).toBe(0);
  });

  it('returns 8 for an all-alive 3×3 grid at center (1,1)', () => {
    expect(countNeighbors(allAlive3x3(), 1, 1)).toBe(8);
  });

  it('returns 3 for an all-alive 3×3 grid at corner (0,0)', () => {
    // 5 of 8 Moore neighbors are off-grid; the 3 in-bounds neighbors
    // are (1,0), (0,1), (1,1) — all alive.
    expect(countNeighbors(allAlive3x3(), 0, 0)).toBe(3);
    expect(countNeighbors(allAlive3x3(), 2, 0)).toBe(3);
    expect(countNeighbors(allAlive3x3(), 0, 2)).toBe(3);
    expect(countNeighbors(allAlive3x3(), 2, 2)).toBe(3);
  });

  it('returns 5 for an all-alive 3×3 grid at edge (1,0)', () => {
    // 3 of 8 Moore neighbors off-grid; 5 in-bounds neighbors all alive.
    expect(countNeighbors(allAlive3x3(), 1, 0)).toBe(5);
    expect(countNeighbors(allAlive3x3(), 0, 1)).toBe(5);
    expect(countNeighbors(allAlive3x3(), 2, 1)).toBe(5);
    expect(countNeighbors(allAlive3x3(), 1, 2)).toBe(5);
  });

  it('returns 0 for any (x,y) when grid is empty (no live neighbors anywhere)', () => {
    const g = createGrid(5, 5);
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        expect(countNeighbors(g, x, y)).toBe(0);
      }
    }
  });

  it('returns 0 for off-grid coordinates (no throw)', () => {
    const g = allAlive3x3();
    expect(countNeighbors(g, -5, -5)).toBe(0);
    expect(countNeighbors(g, 100, 100)).toBe(0);
  });
});
