/**
 * Page-level reducer for the Conway's Game of Life web app.
 *
 * Single source of truth for the simulation UI state. All mutations to the
 * grid (toggle, tick, step, clear, randomize) flow through this reducer so
 * `grid` and `genCount` advance atomically.
 *
 * The discriminated `SimulationAction` union enumerates every action type
 * across Stories 3.1–3.5 even though Stories 3.2–3.5 will fill in their
 * own cases later. This keeps TypeScript's exhaustiveness check honest
 * from day one — Stories 3.2–3.5 *fill* cases, they never widen the union.
 */

import { createGrid, type Grid } from '@cgol-scaffold/sim';
import {
  DEFAULT_DIM,
  DEFAULT_GEN_PER_SEC,
  MAX_DIM,
  MIN_DIM,
} from '../constants.js';

export interface SimulationState {
  grid: Grid;
  running: boolean;
  genCount: number;
  genPerSec: number;
  dimensions: { width: number; height: number };
}

export type SimulationAction =
  | { type: 'setSize'; width: number; height: number }
  | { type: 'toggleCell'; x: number; y: number }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'tick' }
  | { type: 'step' }
  | { type: 'clear' }
  | { type: 'randomize' }
  | { type: 'setGenPerSec'; genPerSec: number };

export const INITIAL_STATE: SimulationState = {
  grid: createGrid(DEFAULT_DIM, DEFAULT_DIM),
  running: false,
  genCount: 0,
  genPerSec: DEFAULT_GEN_PER_SEC,
  dimensions: { width: DEFAULT_DIM, height: DEFAULT_DIM },
};

function isValidDim(n: unknown): n is number {
  return (
    typeof n === 'number' && Number.isInteger(n) && n >= MIN_DIM && n <= MAX_DIM
  );
}

export function simulationReducer(
  state: SimulationState,
  action: SimulationAction,
): SimulationState {
  switch (action.type) {
    case 'setSize': {
      if (!isValidDim(action.width) || !isValidDim(action.height)) return state;
      return {
        ...state,
        grid: createGrid(action.width, action.height),
        dimensions: { width: action.width, height: action.height },
        genCount: 0,
        running: false,
      };
    }
    // Implemented in story 3.2
    case 'toggleCell':
      return state;
    // Implemented in story 3.3
    case 'play':
    case 'pause':
    case 'tick':
    case 'step':
      return state;
    // Implemented in story 3.4
    case 'clear':
    case 'randomize':
      return state;
    // Implemented in story 3.5
    case 'setGenPerSec':
      return state;
    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      return state;
    }
  }
}
