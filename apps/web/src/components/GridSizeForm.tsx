'use client';

import { useState, type FormEvent } from 'react';
import { MAX_DIM, MIN_DIM } from '../app/constants';
import styles from './GridSizeForm.module.css';

interface GridSizeFormProps {
  width: number;
  height: number;
  onResize: (next: { width: number; height: number }) => void;
}

export function GridSizeForm({
  width,
  height,
  onResize,
}: GridSizeFormProps): React.JSX.Element {
  const [widthInput, setWidthInput] = useState<string>(String(width));
  const [heightInput, setHeightInput] = useState<string>(String(height));
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const w = Number(widthInput);
    const h = Number(heightInput);
    if (
      !Number.isInteger(w) ||
      !Number.isInteger(h) ||
      w < MIN_DIM ||
      w > MAX_DIM ||
      h < MIN_DIM ||
      h > MAX_DIM
    ) {
      setError(
        `Width and height must be integers between ${MIN_DIM} and ${MAX_DIM}.`,
      );
      return;
    }
    setError(null);
    onResize({ width: w, height: h });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label htmlFor="grid-width">Width</label>
        <input
          id="grid-width"
          name="width"
          type="number"
          min={MIN_DIM}
          max={MAX_DIM}
          step={1}
          value={widthInput}
          onChange={(e) => setWidthInput(e.target.value)}
          required
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="grid-height">Height</label>
        <input
          id="grid-height"
          name="height"
          type="number"
          min={MIN_DIM}
          max={MAX_DIM}
          step={1}
          value={heightInput}
          onChange={(e) => setHeightInput(e.target.value)}
          required
        />
      </div>
      <button type="submit" className={styles.applyButton}>
        Apply
      </button>
      {error !== null ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
    </form>
  );
}
