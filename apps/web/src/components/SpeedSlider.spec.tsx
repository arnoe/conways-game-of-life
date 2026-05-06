import { fireEvent, render, screen } from '@testing-library/react';
import { SpeedSlider } from './SpeedSlider';

describe('SpeedSlider — render', () => {
  it('renders an input[type=range] with min=1, max=60, step=1, value={genPerSec prop}', () => {
    render(<SpeedSlider genPerSec={10} onChange={() => undefined} />);
    const slider = screen.getByRole('slider') as HTMLInputElement;
    expect(slider.min).toBe('1');
    expect(slider.max).toBe('60');
    expect(slider.step).toBe('1');
    expect(slider.value).toBe('10');
  });

  it('renders an accessible label "Simulation speed in generations per second"', () => {
    render(<SpeedSlider genPerSec={10} onChange={() => undefined} />);
    expect(
      screen.getByLabelText(/simulation speed in generations per second/i),
    ).toBeInTheDocument();
  });

  it('displays the current numeric value visibly (e.g., "10")', () => {
    render(<SpeedSlider genPerSec={10} onChange={() => undefined} />);
    expect(screen.getByTestId('speed-readout')).toHaveTextContent('10');
  });

  it('has aria-valuemin=1, aria-valuemax=60, aria-valuenow={genPerSec}', () => {
    render(<SpeedSlider genPerSec={42} onChange={() => undefined} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuemin', '1');
    expect(slider).toHaveAttribute('aria-valuemax', '60');
    expect(slider).toHaveAttribute('aria-valuenow', '42');
  });
});

describe('SpeedSlider — interactions', () => {
  it('AC-2: changing the slider value via fireEvent.change calls onChange(newValue)', () => {
    const onChange = jest.fn();
    render(<SpeedSlider genPerSec={10} onChange={onChange} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '30' } });
    expect(onChange).toHaveBeenCalledWith(30);
  });

  it('updates aria-valuenow when the prop changes', () => {
    const { rerender } = render(
      <SpeedSlider genPerSec={10} onChange={() => undefined} />,
    );
    rerender(<SpeedSlider genPerSec={45} onChange={() => undefined} />);
    expect(screen.getByRole('slider')).toHaveAttribute(
      'aria-valuenow',
      '45',
    );
    expect(screen.getByTestId('speed-readout')).toHaveTextContent('45');
  });
});

describe('SpeedSlider — accessibility baseline', () => {
  it('slider is keyboard-focusable (tabIndex is not negative)', () => {
    render(<SpeedSlider genPerSec={10} onChange={() => undefined} />);
    const slider = screen.getByRole('slider') as HTMLInputElement;
    expect(slider.tabIndex).toBeGreaterThanOrEqual(0);
  });

  // Story 4.2: ArrowLeft/ArrowRight on `<input type="range">` is browser-native
  // and not reliably simulated by jsdom. The end-to-end verification of
  // arrow-key cadence change lives in `apps/web-e2e/src/e2e/keyboard.spec.ts`,
  // which runs against real Chromium.
});
