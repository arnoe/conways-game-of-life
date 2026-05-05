import { fireEvent, render, screen } from '@testing-library/react';
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

  it('renders a canvas placeholder div sized to dimensions × CELL_SIZE', () => {
    render(<Index />);
    const placeholder = screen.getByTestId('canvas-placeholder');
    expect(placeholder).toBeInTheDocument();
    const expected = 30 * CELL_SIZE;
    expect(placeholder).toHaveStyle({
      width: `${expected}px`,
      height: `${expected}px`,
    });
  });

  it('renders a generation counter showing 0', () => {
    render(<Index />);
    expect(screen.getByTestId('gen-count')).toHaveTextContent('0');
  });
});

describe('page (Story 3.1) — resize integration', () => {
  it('AC-3: applying 50×40 updates the canvas placeholder dimensions', () => {
    render(<Index />);
    fireEvent.change(screen.getByLabelText(/width/i), {
      target: { value: '50' },
    });
    fireEvent.change(screen.getByLabelText(/height/i), {
      target: { value: '40' },
    });
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    const placeholder = screen.getByTestId('canvas-placeholder');
    expect(placeholder).toHaveStyle({
      width: `${50 * CELL_SIZE}px`,
      height: `${40 * CELL_SIZE}px`,
    });
  });
});
