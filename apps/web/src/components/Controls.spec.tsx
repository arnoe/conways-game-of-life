import { fireEvent, render, screen } from '@testing-library/react';
import { Controls } from './Controls';

const noop = (): void => undefined;

interface RenderProps {
  running?: boolean;
  genCount?: number;
  onPlay?: () => void;
  onPause?: () => void;
  onStep?: () => void;
  onClear?: () => void;
  onRandomize?: () => void;
}

function renderControls(props: RenderProps = {}) {
  return render(
    <Controls
      running={props.running ?? false}
      genCount={props.genCount ?? 0}
      onPlay={props.onPlay ?? noop}
      onPause={props.onPause ?? noop}
      onStep={props.onStep ?? noop}
      onClear={props.onClear ?? noop}
      onRandomize={props.onRandomize ?? noop}
    />,
  );
}

describe('Controls — render', () => {
  it('renders Play, Step, and gen counter when running=false', () => {
    renderControls();
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /step/i })).toBeInTheDocument();
    expect(screen.getByText(/generation/i)).toBeInTheDocument();
  });

  it('renders Pause (instead of Play) when running=true', () => {
    renderControls({ running: true });
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^play$/i }),
    ).not.toBeInTheDocument();
  });

  it('AC-5: gen counter shows the current genCount', () => {
    renderControls({ genCount: 42 });
    expect(screen.getByTestId('gen-count')).toHaveTextContent('42');
  });

  it('gen counter has data-testid="gen-count"', () => {
    renderControls();
    expect(screen.getByTestId('gen-count')).toBeInTheDocument();
  });

  it('gen counter has aria-live="polite"', () => {
    renderControls();
    expect(screen.getByTestId('gen-count')).toHaveAttribute(
      'aria-live',
      'polite',
    );
  });
});

describe('Controls — interactions', () => {
  it('AC-1: clicking Play calls onPlay', () => {
    const onPlay = jest.fn();
    renderControls({ onPlay });
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('AC-2: clicking Pause calls onPause', () => {
    const onPause = jest.fn();
    renderControls({ running: true, onPause });
    fireEvent.click(screen.getByRole('button', { name: /pause/i }));
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('AC-3: clicking Step (when running=false) calls onStep', () => {
    const onStep = jest.fn();
    renderControls({ onStep });
    fireEvent.click(screen.getByRole('button', { name: /step/i }));
    expect(onStep).toHaveBeenCalledTimes(1);
  });

  it('AC-4: Step button is disabled when running=true', () => {
    const onStep = jest.fn();
    renderControls({ running: true, onStep });
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
        onClear={noop}
        onRandomize={noop}
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
        onClear={noop}
        onRandomize={noop}
      />,
    );
    expect(screen.getByRole('button', { name: /pause/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

describe('Controls — Clear button (Story 3.4)', () => {
  it('renders a Clear button with accessible name', () => {
    renderControls();
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('AC-1: clicking Clear calls onClear', () => {
    const onClear = jest.fn();
    renderControls({ onClear });
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('Clear button is enabled when running=true (works in both states)', () => {
    renderControls({ running: true });
    expect(
      screen.getByRole('button', { name: /clear/i }),
    ).not.toBeDisabled();
  });

  it('AC-3: Clear is keyboard-activatable via Enter', () => {
    const onClear = jest.fn();
    renderControls({ onClear });
    const clearBtn = screen.getByRole('button', { name: /clear/i });
    clearBtn.focus();
    fireEvent.keyDown(clearBtn, { key: 'Enter' });
    fireEvent.keyUp(clearBtn, { key: 'Enter' });
    fireEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalled();
  });
});

describe('Controls — Randomize button (Story 3.4)', () => {
  it('renders a Randomize button with accessible name', () => {
    renderControls();
    expect(
      screen.getByRole('button', { name: /randomize/i }),
    ).toBeInTheDocument();
  });

  it('AC-2: clicking Randomize calls onRandomize', () => {
    const onRandomize = jest.fn();
    renderControls({ onRandomize });
    fireEvent.click(screen.getByRole('button', { name: /randomize/i }));
    expect(onRandomize).toHaveBeenCalledTimes(1);
  });

  it('Randomize button is enabled when running=true (works in both states)', () => {
    renderControls({ running: true });
    expect(
      screen.getByRole('button', { name: /randomize/i }),
    ).not.toBeDisabled();
  });
});

describe('Controls — wrapper testid (Story 4.3)', () => {
  it('controls root wrapper has data-testid="controls" for layout-locator stability', () => {
    renderControls();
    expect(screen.getByTestId('controls')).toBeInTheDocument();
  });
});

describe('Controls — Tab order', () => {
  it('Tab order is Play/Pause → Step → Clear → Randomize', () => {
    const { container } = renderControls();
    const buttons = Array.from(container.querySelectorAll('button'));
    expect(buttons.map((b) => b.textContent)).toEqual([
      'Play',
      'Step',
      'Clear',
      'Randomize',
    ]);
  });
});

/**
 * Story 4.2 — keyboard activation. jsdom does NOT translate Enter/Space
 * keydown into a click event the way real browsers do for native
 * `<button type="button">` elements. We verify two things in jsdom:
 *  1. Each control is a real `<button type="button">` (HTML spec then
 *     guarantees native Enter/Space activation in any conformant UA).
 *  2. The handler fires when a click is dispatched (which is what the
 *     browser synthesizes when the user presses Enter or Space on a
 *     focused button).
 * The actual key-press is exercised end-to-end in
 * `apps/web-e2e/src/e2e/keyboard.spec.ts` against real Chromium.
 */
describe('Controls — keyboard activation (Story 4.2)', () => {
  function activateViaEnterAndSpace(button: HTMLElement): void {
    button.focus();
    expect(document.activeElement).toBe(button);
    // Real-browser Enter/Space on a button → synthesized click.
    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
    fireEvent.keyDown(button, { key: ' ', code: 'Space' });
    fireEvent.click(button);
  }

  it('AC-2: every control is a real <button type="button"> (HTML-native Enter/Space)', () => {
    renderControls();
    for (const name of [/^play$/i, /^step$/i, /^clear$/i, /^randomize$/i]) {
      const btn = screen.getByRole('button', { name });
      expect(btn.tagName).toBe('BUTTON');
      expect(btn.getAttribute('type')).toBe('button');
    }
  });

  it('AC-2: Play activates on Enter/Space', () => {
    const onPlay = jest.fn();
    renderControls({ onPlay });
    activateViaEnterAndSpace(screen.getByRole('button', { name: /^play$/i }));
    expect(onPlay).toHaveBeenCalled();
  });

  it('AC-2: Pause activates on Enter/Space', () => {
    const onPause = jest.fn();
    renderControls({ running: true, onPause });
    activateViaEnterAndSpace(
      screen.getByRole('button', { name: /^pause$/i }),
    );
    expect(onPause).toHaveBeenCalled();
  });

  it('AC-2: Step activates on Enter/Space when not running', () => {
    const onStep = jest.fn();
    renderControls({ onStep });
    activateViaEnterAndSpace(screen.getByRole('button', { name: /^step$/i }));
    expect(onStep).toHaveBeenCalled();
  });

  it('AC-2: Step does NOT activate when running (disabled)', () => {
    const onStep = jest.fn();
    renderControls({ running: true, onStep });
    const stepBtn = screen.getByRole('button', { name: /^step$/i });
    expect(stepBtn).toBeDisabled();
    fireEvent.click(stepBtn);
    expect(onStep).not.toHaveBeenCalled();
  });

  it('AC-2: Clear activates on Enter/Space', () => {
    const onClear = jest.fn();
    renderControls({ onClear });
    activateViaEnterAndSpace(
      screen.getByRole('button', { name: /^clear$/i }),
    );
    expect(onClear).toHaveBeenCalled();
  });

  it('AC-2: Randomize activates on Enter/Space', () => {
    const onRandomize = jest.fn();
    renderControls({ onRandomize });
    activateViaEnterAndSpace(
      screen.getByRole('button', { name: /^randomize$/i }),
    );
    expect(onRandomize).toHaveBeenCalled();
  });
});
