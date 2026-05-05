// Public barrel for @cgol-scaffold/sim — types + grid primitives + rules.
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
export { step } from './lib/rules/conway.js';
export { randomizeGrid } from './lib/randomize.js';
