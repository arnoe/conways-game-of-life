import { act, fireEvent, render, screen } from '@testing-library/react';
import Index from './page';
import { CELL_SIZE } from './constants';

describe('page (Story 3.1) — initial render', () => {
  it("renders the title \"Conway's Game of Life\"", () => {
    render(<Index />);
    expect(
      screen.getByRole('heading', { level: 1, name: /conway/i }),
    ).toBeInTheDocument();
  });

  it('renders the GridSizeForm with default 30×30', () => {
    render(<Index />);
    expect(screen.getByLabelText(/width/i)).toHaveValue(30);
    expect(screen.getByLabelText(/height/i)).toHaveValue(30);
  });

  it('renders a canvas element (Story 3.2 wiring)', () => {
    render(<Index />);
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('renders a generation counter showing 0', () => {
    render(<Index />);
    expect(screen.getByTestId('gen-count')).toHaveTextContent('0');
  });
});

describe('page (Story 3.1) — resize integration', () => {
  it('AC-3: applying 50×40 updates the canvas dimensions (CSS sized via grid × CELL_SIZE)', () => {
    render(<Index />);
    fireEvent.change(screen.getByLabelText(/width/i), {
      target: { value: '50' },
    });
    fireEvent.change(screen.getByLabelText(/height/i), {
      target: { value: '40' },
    });
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    const canvas = screen.getByTestId('canvas') as HTMLCanvasElement;
    expect(canvas.style.width).toBe(`${50 * CELL_SIZE}px`);
    expect(canvas.style.height).toBe(`${40 * CELL_SIZE}px`);
  });
});

describe('page (Story 3.2) — click toggles cells end-to-end', () => {
  function mockRect(canvas: HTMLCanvasElement, dim: number) {
    canvas.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: dim * CELL_SIZE,
        height: dim * CELL_SIZE,
        right: dim * CELL_SIZE,
        bottom: dim * CELL_SIZE,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
  }

  it('AC-1: pointerdown at (10, 10) when paused → fires onPointerDown so the page reducer toggles the cell', () => {
    render(<Index />);
    const canvas = screen.getByTestId('canvas') as HTMLCanvasElement;
    mockRect(canvas, 30);

    interface RecordedEvent {
      type: string;
    }
    type Recordable = CanvasRenderingContext2D & {
      __getEvents?: () => ReadonlyArray<RecordedEvent>;
    };

    // First click toggles (0,0) alive — produces an alive fillRect on next render.
    act(() => {
      fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 });
    });
    const ctx = canvas.getContext('2d') as Recordable | null;
    const events = ctx?.__getEvents?.() ?? [];
    // Cumulative recorded fillRect events should now include at least one alive fill
    // beyond the initial background fill — i.e., at least 3 (initial-bg + post-toggle-bg + alive).
    const fillRectCount = events.filter(
      (e: RecordedEvent) => e.type === 'fillRect',
    ).length;
    expect(fillRectCount).toBeGreaterThanOrEqual(3);
  });
});
