'use client';

import styles from './Controls.module.css';

interface ControlsProps {
  running: boolean;
  genCount: number;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
}

export function Controls({
  running,
  genCount,
  onPlay,
  onPause,
  onStep,
}: ControlsProps): React.JSX.Element {
  return (
    <div className={styles.controls}>
      <button
        type="button"
        className={styles.button}
        onClick={running ? onPause : onPlay}
        aria-pressed={running}
      >
        {running ? 'Pause' : 'Play'}
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={onStep}
        disabled={running}
        aria-disabled={running}
      >
        Step
      </button>
      <div className={styles.counter}>
        <span>Generation: </span>
        <span data-testid="gen-count" aria-live="polite">
          {genCount}
        </span>
      </div>
    </div>
  );
}
