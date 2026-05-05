import { INITIAL_STATE, simulationReducer } from './simulation-state';

describe('simulationReducer — setSize action (Story 3.1)', () => {
  it('dispatching setSize with valid 50×40 produces a 50×40 empty grid and zeroes genCount', () => {
    const next = simulationReducer(
      { ...INITIAL_STATE, genCount: 12 },
      { type: 'setSize', width: 50, height: 40 },
    );
    expect(next.grid.width).toBe(50);
    expect(next.grid.height).toBe(40);
    expect(next.grid.cells.every((c) => c === 0)).toBe(true);
    expect(next.dimensions).toEqual({ width: 50, height: 40 });
    expect(next.genCount).toBe(0);
  });

  it('dispatching setSize with width=0 returns state unchanged (validation guard)', () => {
    const next = simulationReducer(INITIAL_STATE, {
      type: 'setSize',
      width: 0,
      height: 30,
    });
    expect(next).toBe(INITIAL_STATE);
  });

  it('dispatching setSize with width=999 returns state unchanged (above max)', () => {
    const next = simulationReducer(INITIAL_STATE, {
      type: 'setSize',
      width: 999,
      height: 30,
    });
    expect(next).toBe(INITIAL_STATE);
  });

  it('dispatching setSize with non-integer width=10.5 returns state unchanged', () => {
    const next = simulationReducer(INITIAL_STATE, {
      type: 'setSize',
      width: 10.5,
      height: 30,
    });
    expect(next).toBe(INITIAL_STATE);
  });

  it('dispatching setSize when running=true sets running=false (pause + clear)', () => {
    const next = simulationReducer(
      { ...INITIAL_STATE, running: true },
      { type: 'setSize', width: 20, height: 20 },
    );
    expect(next.running).toBe(false);
  });

  it('setSize allocates a new Grid object (reference-distinct from previous)', () => {
    const before = { ...INITIAL_STATE };
    const next = simulationReducer(before, {
      type: 'setSize',
      width: 30,
      height: 30,
    });
    expect(next.grid).not.toBe(before.grid);
  });

  it('setSize at min bounds (5×5) succeeds', () => {
    const next = simulationReducer(INITIAL_STATE, {
      type: 'setSize',
      width: 5,
      height: 5,
    });
    expect(next.grid.width).toBe(5);
    expect(next.grid.height).toBe(5);
  });

  it('setSize at max bounds (200×200) succeeds', () => {
    const next = simulationReducer(INITIAL_STATE, {
      type: 'setSize',
      width: 200,
      height: 200,
    });
    expect(next.grid.width).toBe(200);
    expect(next.grid.height).toBe(200);
  });
});

describe('simulationReducer — toggleCell action (Story 3.2)', () => {
  it('AC-1: toggleCell on a dead cell at (3, 5) makes it alive', () => {
    const next = simulationReducer(INITIAL_STATE, {
      type: 'toggleCell',
      x: 3,
      y: 5,
    });
    const idx = 5 * INITIAL_STATE.grid.width + 3;
    expect(next.grid.cells[idx]).toBe(1);
  });

  it('AC-2: toggleCell twice on the same cell leaves it dead', () => {
    const after1 = simulationReducer(INITIAL_STATE, {
      type: 'toggleCell',
      x: 3,
      y: 5,
    });
    const after2 = simulationReducer(after1, {
      type: 'toggleCell',
      x: 3,
      y: 5,
    });
    const idx = 5 * after2.grid.width + 3;
    expect(after2.grid.cells[idx]).toBe(0);
  });

  it('AC-3: toggleCell when running=true returns state unchanged', () => {
    const running = { ...INITIAL_STATE, running: true };
    const next = simulationReducer(running, {
      type: 'toggleCell',
      x: 3,
      y: 5,
    });
    expect(next).toBe(running);
  });

  it('toggleCell with x=-1 returns state unchanged', () => {
    const next = simulationReducer(INITIAL_STATE, {
      type: 'toggleCell',
      x: -1,
      y: 0,
    });
    expect(next).toBe(INITIAL_STATE);
  });

  it('toggleCell with x=width returns state unchanged', () => {
    const next = simulationReducer(INITIAL_STATE, {
      type: 'toggleCell',
      x: INITIAL_STATE.dimensions.width,
      y: 0,
    });
    expect(next).toBe(INITIAL_STATE);
  });

  it('toggleCell allocates a new Grid object (immutability invariant)', () => {
    const next = simulationReducer(INITIAL_STATE, {
      type: 'toggleCell',
      x: 0,
      y: 0,
    });
    expect(next.grid).not.toBe(INITIAL_STATE.grid);
    expect(next.grid.cells).not.toBe(INITIAL_STATE.grid.cells);
  });
});

describe('simulationReducer — play/pause (Story 3.3)', () => {
  it('AC-1: dispatching play when running=false sets running=true', () => {
    const next = simulationReducer(INITIAL_STATE, { type: 'play' });
    expect(next.running).toBe(true);
  });

  it('dispatching play when already running returns state unchanged (no-op)', () => {
    const running = { ...INITIAL_STATE, running: true };
    expect(simulationReducer(running, { type: 'play' })).toBe(running);
  });

  it('AC-2: dispatching pause when running=true sets running=false', () => {
    const running = { ...INITIAL_STATE, running: true };
    const next = simulationReducer(running, { type: 'pause' });
    expect(next.running).toBe(false);
  });

  it('dispatching pause when already paused returns state unchanged', () => {
    expect(simulationReducer(INITIAL_STATE, { type: 'pause' })).toBe(
      INITIAL_STATE,
    );
  });
});

describe('simulationReducer — tick (Story 3.3)', () => {
  it('AC-1: dispatching tick when running advances grid via step() and increments genCount', () => {
    const running = { ...INITIAL_STATE, running: true };
    const next = simulationReducer(running, { type: 'tick' });
    expect(next.genCount).toBe(1);
    expect(next.grid).not.toBe(running.grid);
  });

  it('dispatching tick when paused returns state unchanged', () => {
    expect(simulationReducer(INITIAL_STATE, { type: 'tick' })).toBe(
      INITIAL_STATE,
    );
  });
});

describe('simulationReducer — step (Story 3.3)', () => {
  it('AC-3: dispatching step when paused advances grid by exactly one generation and increments genCount by 1', () => {
    const next = simulationReducer(INITIAL_STATE, { type: 'step' });
    expect(next.genCount).toBe(1);
    expect(next.grid).not.toBe(INITIAL_STATE.grid);
  });

  it('AC-4: dispatching step when running returns state unchanged', () => {
    const running = { ...INITIAL_STATE, running: true };
    expect(simulationReducer(running, { type: 'step' })).toBe(running);
  });
});

describe('simulationReducer — placeholder cases (no-op until later stories)', () => {
  it('clear, randomize, setGenPerSec all return state unchanged', () => {
    const s = INITIAL_STATE;
    expect(simulationReducer(s, { type: 'clear' })).toBe(s);
    expect(simulationReducer(s, { type: 'randomize' })).toBe(s);
    expect(simulationReducer(s, { type: 'setGenPerSec', genPerSec: 30 })).toBe(
      s,
    );
  });
});
