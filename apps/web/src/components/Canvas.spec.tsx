import { fireEvent, render, screen } from '@testing-library/react';
import { createGrid, toggleCell, type Grid } from '@cgol-scaffold/sim';
import { Canvas } from './Canvas';
import { CELL_SIZE } from '../app/constants';

interface RecordedEvent {
  type: string;
  props?: { fillStyle?: string };
}
type RecordableContext = CanvasRenderingContext2D & {
  __getEvents?: () => ReadonlyArray<RecordedEvent>;
};

function paintCells(grid: Grid, coords: ReadonlyArray<[number, number]>): Grid {
  return coords.reduce<Grid>((acc, [x, y]) => toggleCell(acc, x, y), grid);
}

function mockBoundingClientRect(canvas: HTMLCanvasElement, width: number) {
  canvas.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width,
      height: width,
      right: width,
      bottom: width,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
}

describe('Canvas — render', () => {
  it('AC-4: renders a single <canvas> element (no DOM-per-cell)', () => {
    const grid = createGrid(10, 10);
    const { container } = render(
      <Canvas grid={grid} running={false} onToggleCell={() => undefined} />,
    );
    expect(container.querySelectorAll('canvas')).toHaveLength(1);
    expect(container.querySelectorAll('div[data-cell]')).toHaveLength(0);
  });

  it('canvas has CSS dimensions matching grid × CELL_SIZE', () => {
    const grid = createGrid(10, 10);
    render(
      <Canvas grid={grid} running={false} onToggleCell={() => undefined} />,
    );
    const canvas = screen.getByTestId('canvas') as HTMLCanvasElement;
    const expected = 10 * CELL_SIZE;
    expect(canvas.style.width).toBe(`${expected}px`);
    expect(canvas.style.height).toBe(`${expected}px`);
  });

  it('canvas internal resolution accounts for devicePixelRatio', () => {
    const original = window.devicePixelRatio;
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: 2,
    });
    const grid = createGrid(10, 10);
    render(
      <Canvas grid={grid} running={false} onToggleCell={() => undefined} />,
    );
    const canvas = screen.getByTestId('canvas') as HTMLCanvasElement;
    expect(canvas.width).toBe(10 * CELL_SIZE * 2);
    expect(canvas.height).toBe(10 * CELL_SIZE * 2);
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: original,
    });
  });

  it('AC-4: useEffect on grid triggers redraw — fillRect is called for each alive cell', () => {
    const grid = paintCells(createGrid(5, 5), [
      [0, 0],
      [1, 1],
      [2, 2],
    ]);
    render(
      <Canvas grid={grid} running={false} onToggleCell={() => undefined} />,
    );
    const canvas = screen.getByTestId('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d') as RecordableContext | null;
    expect(ctx).not.toBeNull();
    if (ctx === null) return;
    const events = ctx.__getEvents?.() ?? [];
    const fillRectCount = events.filter(
      (e: RecordedEvent) => e.type === 'fillRect',
    ).length;
    // 1 background fill + 3 alive-cell fills
    expect(fillRectCount).toBeGreaterThanOrEqual(4);
  });

  it('redraws when grid prop changes', () => {
    const gridA = paintCells(createGrid(5, 5), [[0, 0]]);
    const gridB = paintCells(createGrid(5, 5), [
      [1, 1],
      [2, 2],
      [3, 3],
    ]);
    const { rerender } = render(
      <Canvas grid={gridA} running={false} onToggleCell={() => undefined} />,
    );
    rerender(
      <Canvas grid={gridB} running={false} onToggleCell={() => undefined} />,
    );
    const canvas = screen.getByTestId('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d') as RecordableContext | null;
    expect(ctx).not.toBeNull();
    if (ctx === null) return;
    const events = ctx.__getEvents?.() ?? [];
    // Two redraws happened: 1 bg + 1 alive (gridA) and 1 bg + 3 alive (gridB) = 6
    const fillRectCount = events.filter(
      (e: RecordedEvent) => e.type === 'fillRect',
    ).length;
    expect(fillRectCount).toBeGreaterThanOrEqual(6);
  });
});

describe('Canvas — click/tap to toggle', () => {
  it('AC-1: pointerdown at (10, 10) when CELL_SIZE=12 dispatches toggleCell(0, 0)', () => {
    const grid = createGrid(30, 30);
    const onToggleCell = jest.fn();
    render(
      <Canvas grid={grid} running={false} onToggleCell={onToggleCell} />,
    );
    const canvas = screen.getByTestId('canvas') as HTMLCanvasElement;
    mockBoundingClientRect(canvas, 30 * CELL_SIZE);
    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 });
    expect(onToggleCell).toHaveBeenCalledWith(0, 0);
  });

  it('pointerdown at (25, 14) dispatches toggleCell(2, 1)', () => {
    const grid = createGrid(30, 30);
    const onToggleCell = jest.fn();
    render(
      <Canvas grid={grid} running={false} onToggleCell={onToggleCell} />,
    );
    const canvas = screen.getByTestId('canvas') as HTMLCanvasElement;
    mockBoundingClientRect(canvas, 30 * CELL_SIZE);
    fireEvent.pointerDown(canvas, { clientX: 25, clientY: 14 });
    expect(onToggleCell).toHaveBeenCalledWith(2, 1);
  });

  it('AC-5: pointerdown when CSS-scaled (rect.width=180) computes coords from rect-derived cellSize', () => {
    const grid = createGrid(30, 30);
    const onToggleCell = jest.fn();
    render(
      <Canvas grid={grid} running={false} onToggleCell={onToggleCell} />,
    );
    const canvas = screen.getByTestId('canvas') as HTMLCanvasElement;
    mockBoundingClientRect(canvas, 180);
    // rect cellSize = 180/30 = 6. clientX=6 → floor(6/6)=1
    fireEvent.pointerDown(canvas, { clientX: 6, clientY: 0 });
    expect(onToggleCell).toHaveBeenCalledWith(1, 0);
  });

  it('pointerdown beyond canvas bounds (clientX past right edge) does not dispatch', () => {
    const grid = createGrid(10, 10);
    const onToggleCell = jest.fn();
    render(
      <Canvas grid={grid} running={false} onToggleCell={onToggleCell} />,
    );
    const canvas = screen.getByTestId('canvas') as HTMLCanvasElement;
    mockBoundingClientRect(canvas, 10 * CELL_SIZE);
    // clientX equals rect.width → cssX === rect.width → out of bounds (>=).
    fireEvent.pointerDown(canvas, {
      clientX: 10 * CELL_SIZE,
      clientY: 10 * CELL_SIZE,
    });
    expect(onToggleCell).not.toHaveBeenCalled();
  });
});

describe('Canvas — running state guards', () => {
  it('AC-3: pointerdown when running=true does not dispatch toggleCell', () => {
    const grid = createGrid(10, 10);
    const onToggleCell = jest.fn();
    render(
      <Canvas grid={grid} running={true} onToggleCell={onToggleCell} />,
    );
    const canvas = screen.getByTestId('canvas') as HTMLCanvasElement;
    mockBoundingClientRect(canvas, 10 * CELL_SIZE);
    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 });
    expect(onToggleCell).not.toHaveBeenCalled();
  });
});

describe('Canvas — touch-scroll friendliness', () => {
  it('canvas has touch-action: none style', () => {
    const grid = createGrid(10, 10);
    render(
      <Canvas grid={grid} running={false} onToggleCell={() => undefined} />,
    );
    const canvas = screen.getByTestId('canvas') as HTMLCanvasElement;
    expect(canvas.style.touchAction).toBe('none');
  });
});
