/**
 * Shared UI constants for the Conway's Game of Life web app.
 *
 * Locked across Stories 3.1–3.5 — see the implementation-artifact
 * documents in `docs/implementation-artifacts/3-*.md` for rationale.
 */

/** CSS pixels per cell (architecture §5.3, locked Story 3.2). */
export const CELL_SIZE = 12;

/** Inclusive lower bound on grid dimension (project-context rule #17). */
export const MIN_DIM = 5;

/** Inclusive upper bound on grid dimension (project-context rule #17). */
export const MAX_DIM = 200;

/** Default starting grid width and height. */
export const DEFAULT_DIM = 30;

/** Default tick rate in generations per second. */
export const DEFAULT_GEN_PER_SEC = 10;

/** Inclusive lower bound on the speed slider (Story 3.5). */
export const MIN_GEN_PER_SEC = 1;

/** Inclusive upper bound on the speed slider (Story 3.5). */
export const MAX_GEN_PER_SEC = 60;

/** Density passed to randomizeGrid (project-context rule #17, FR4). */
export const DEFAULT_DENSITY = 0.3;

/** Dead-cell color, drawn as the canvas background (architecture §5.3). */
export const DEAD_COLOR = '#0a0a0a';

/** Alive-cell color (architecture §5.3, "cyan-400" hex literal). */
export const ALIVE_COLOR = '#22d3ee';
