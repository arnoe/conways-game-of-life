import { fireEvent, render, screen } from '@testing-library/react';
import { Controls } from './Controls';

const noop = (): void => undefined;

describe('Controls — render', () => {
  it('renders Play, Step, and gen counter when running=false', () => {
    render(
      <Controls
        running={false}
        genCount={0}
        onPlay={noop}
        onPause={noop}
        onStep={noop}
      />,
    );
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /step/i })).toBeInTheDocument();
    expect(screen.getByText(/generation/i)).toBeInTheDocument();
  });

  it('renders Pause (instead of Play) when running=true', () => {
    render(
      <Controls
        running={true}
        genCount={0}
        onPlay={noop}
        onPause={noop}
        onStep={noop}
      />,
    );
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^play$/i }),
    ).not.toBeInTheDocument();
  });

  it('AC-5: gen counter shows the current genCount', () => {
    render(
      <Controls
        running={false}
        genCount={42}
        onPlay={noop}
        onPause={noop}
        onStep={noop}
      />,
    );
    expect(screen.getByTestId('gen-count')).toHaveTextContent('42');
  });

  it('gen counter has data-testid="gen-count"', () => {
    render(
      <Controls
        running={false}
        genCount={0}
        onPlay={noop}
        onPause={noop}
        onStep={noop}
      />,
    );
    expect(screen.getByTestId('gen-count')).toBeInTheDocument();
  });

  it('gen counter has aria-live="polite"', () => {
    render(
      <Controls
        running={false}
        genCount={0}
        onPlay={noop}
        onPause={noop}
        onStep={noop}
      />,
    );
    expect(screen.getByTestId('gen-count')).toHaveAttribute(
      'aria-live',
      'polite',
    );
  });
});

describe('Controls — interactions', () => {
  it('AC-1: clicking Play calls onPlay', () => {
    const onPlay = jest.fn();
    render(
      <Controls
        running={false}
        genCount={0}
        onPlay={onPlay}
        onPause={noop}
        onStep={noop}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('AC-2: clicking Pause calls onPause', () => {
    const onPause = jest.fn();
    render(
      <Controls
        running={true}
        genCount={0}
        onPlay={noop}
        onPause={onPause}
        onStep={noop}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /pause/i }));
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('AC-3: clicking Step (when running=false) calls onStep', () => {
    const onStep = jest.fn();
    render(
      <Controls
        running={false}
        genCount={0}
        onPlay={noop}
        onPause={noop}
        onStep={onStep}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /step/i }));
    expect(onStep).toHaveBeenCalledTimes(1);
  });

  it('AC-4: Step button is disabled when running=true', () => {
    const onStep = jest.fn();
    render(
      <Controls
        running={true}
        genCount={0}
        onPlay={noop}
        onPause={noop}
        onStep={onStep}
      />,
    );
    const stepBtn = screen.getByRole('button', { name: /step/i });
    expect(stepBtn).toBeDisabled();
    fireEvent.click(stepBtn);
    expect(onStep).not.toHaveBeenCalled();
  });

  it('Play/Pause button has aria-pressed reflecting running state', () => {
    const { rerender } = render(
      <Controls
        running={false}
        genCount={0}
        onPlay={noop}
        onPause={noop}
        onStep={noop}
      />,
    );
    expect(screen.getByRole('button', { name: /play/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    rerender(
      <Controls
        running={true}
        genCount={0}
        onPlay={noop}
        onPause={noop}
        onStep={noop}
      />,
    );
    expect(screen.getByRole('button', { name: /pause/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
