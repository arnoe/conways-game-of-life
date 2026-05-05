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

  it('renders a canvas element', () => {
    render(<Index />);
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('renders a generation counter showing 0', () => {
    render(<Index />);
    expect(screen.getByTestId('gen-count')).toHaveTextContent('0');
  });
});

describe('page (Story 3.1) — resize integration', () => {
  it('AC-3: applying 50×40 updates the canvas dimensions', () => {
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

    act(() => {
      fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 });
    });
    const ctx = canvas.getContext('2d') as Recordable | null;
    const events = ctx?.__getEvents?.() ?? [];
    const fillRectCount = events.filter(
      (e: RecordedEvent) => e.type === 'fillRect',
    ).length;
    expect(fillRectCount).toBeGreaterThanOrEqual(3);
  });
});

describe('page (Story 3.3) — Play/Pause/Step integration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('AC-3: clicking Step when paused increments gen-count by 1', () => {
    render(<Index />);
    expect(screen.getByTestId('gen-count')).toHaveTextContent('0');
    fireEvent.click(screen.getByRole('button', { name: /step/i }));
    expect(screen.getByTestId('gen-count')).toHaveTextContent('1');
  });

  it('AC-4: Step button is disabled while running', () => {
    render(<Index />);
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    expect(screen.getByRole('button', { name: /step/i })).toBeDisabled();
  });

  it('AC-1 + AC-2: clicking Play, advancing 200ms, then Pause → gen-count moves and stops', () => {
    render(<Index />);
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    act(() => {
      jest.advanceTimersByTime(200);
    });
    const after200 = Number(
      screen.getByTestId('gen-count').textContent ?? '0',
    );
    expect(after200).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /pause/i }));
    act(() => {
      jest.advanceTimersByTime(500);
    });
    const afterPause = Number(
      screen.getByTestId('gen-count').textContent ?? '0',
    );
    expect(afterPause).toBe(after200);
  });

  it('Story 3.1 cross-check (AC-5): submitting GridSizeForm while running pauses and clears', () => {
    render(<Index />);
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    act(() => {
      jest.advanceTimersByTime(200);
    });
    fireEvent.change(screen.getByLabelText(/width/i), {
      target: { value: '20' },
    });
    fireEvent.change(screen.getByLabelText(/height/i), {
      target: { value: '20' },
    });
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    expect(screen.getByTestId('gen-count')).toHaveTextContent('0');
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
  });
});

describe('page (Story 3.4) — Clear/Randomize integration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('AC-1: clicking Clear resets gen-count to 0', () => {
    render(<Index />);
    // Step a few times to drive gen-count up
    fireEvent.click(screen.getByRole('button', { name: /step/i }));
    fireEvent.click(screen.getByRole('button', { name: /step/i }));
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(screen.getByTestId('gen-count')).toHaveTextContent('0');
  });

  it('AC-1: clicking Clear while running pauses the simulation', () => {
    render(<Index />);
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    act(() => {
      jest.advanceTimersByTime(200);
    });
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(
      screen.getByRole('button', { name: /play/i }),
    ).toBeInTheDocument();
  });

  it('AC-2: clicking Randomize while running pauses and resets gen-count to 0', () => {
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0.1);
    try {
      render(<Index />);
      fireEvent.click(screen.getByRole('button', { name: /play/i }));
      act(() => {
        jest.advanceTimersByTime(200);
      });
      fireEvent.click(
        screen.getByRole('button', { name: /randomize/i }),
      );
      expect(screen.getByTestId('gen-count')).toHaveTextContent('0');
      expect(
        screen.getByRole('button', { name: /play/i }),
      ).toBeInTheDocument();
    } finally {
      spy.mockRestore();
    }
  });
});
