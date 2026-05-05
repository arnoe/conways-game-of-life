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

describe('simulationReducer — placeholder cases (no-op until later stories)', () => {
  it('toggleCell, play, pause, tick, step, clear, randomize, setGenPerSec all return state unchanged', () => {
    const s = INITIAL_STATE;
    expect(simulationReducer(s, { type: 'toggleCell', x: 0, y: 0 })).toBe(s);
    expect(simulationReducer(s, { type: 'play' })).toBe(s);
    expect(simulationReducer(s, { type: 'pause' })).toBe(s);
    expect(simulationReducer(s, { type: 'tick' })).toBe(s);
    expect(simulationReducer(s, { type: 'step' })).toBe(s);
    expect(simulationReducer(s, { type: 'clear' })).toBe(s);
    expect(simulationReducer(s, { type: 'randomize' })).toBe(s);
    expect(simulationReducer(s, { type: 'setGenPerSec', genPerSec: 30 })).toBe(
      s,
    );
  });
});
