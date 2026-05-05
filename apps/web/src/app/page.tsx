'use client';

import { useReducer } from 'react';
import { GridSizeForm } from '../components/GridSizeForm.js';
import { CELL_SIZE } from './constants.js';
import {
  INITIAL_STATE,
  simulationReducer,
} from './state/simulation-state.js';
import styles from './page.module.css';

export default function Index(): React.JSX.Element {
  const [state, dispatch] = useReducer(simulationReducer, INITIAL_STATE);

  const cssWidth = state.dimensions.width * CELL_SIZE;
  const cssHeight = state.dimensions.height * CELL_SIZE;

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Conway&apos;s Game of Life</h1>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <GridSizeForm
            width={state.dimensions.width}
            height={state.dimensions.height}
            onResize={({ width, height }) =>
              dispatch({ type: 'setSize', width, height })
            }
          />
          <div className={styles.counter}>
            <span>Generation: </span>
            <span data-testid="gen-count">{state.genCount}</span>
          </div>
        </aside>
        <div className={styles.canvasArea}>
          <div
            data-testid="canvas-placeholder"
            className={styles.canvasPlaceholder}
            style={{ width: `${cssWidth}px`, height: `${cssHeight}px` }}
          />
        </div>
      </div>
    </main>
  );
}
