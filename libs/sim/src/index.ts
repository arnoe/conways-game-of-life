// Public barrel for @cgol-scaffold/sim — types + grid primitives.
export type { Cell, Coord, Grid } from './lib/types.js';
export {
  clearGrid,
  cloneGrid,
  countNeighbors,
  createGrid,
  getCell,
  setCell,
  toggleCell,
} from './lib/grid.js';
