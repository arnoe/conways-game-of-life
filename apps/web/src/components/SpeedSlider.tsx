'use client';

import { MAX_GEN_PER_SEC, MIN_GEN_PER_SEC } from '../app/constants.js';
import styles from './SpeedSlider.module.css';

interface SpeedSliderProps {
  genPerSec: number;
  onChange: (next: number) => void;
}

export function SpeedSlider({
  genPerSec,
  onChange,
}: SpeedSliderProps): React.JSX.Element {
  return (
    <div className={styles.wrapper}>
      <label className={styles.label} htmlFor="speed-slider">
        Speed: <span data-testid="speed-readout">{genPerSec}</span> gen/sec
      </label>
      <input
        id="speed-slider"
        type="range"
        min={MIN_GEN_PER_SEC}
        max={MAX_GEN_PER_SEC}
        step={1}
        value={genPerSec}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Simulation speed in generations per second"
        aria-valuemin={MIN_GEN_PER_SEC}
        aria-valuemax={MAX_GEN_PER_SEC}
        aria-valuenow={genPerSec}
        className={styles.slider}
      />
    </div>
  );
}
