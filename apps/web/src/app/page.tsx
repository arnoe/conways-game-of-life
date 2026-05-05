'use client';

import { useReducer } from 'react';
import { Canvas } from '../components/Canvas.js';
import { GridSizeForm } from '../components/GridSizeForm.js';
import {
  INITIAL_STATE,
  simulationReducer,
} from './state/simulation-state.js';
import styles from './page.module.css';

export default function Index(): React.JSX.Element {
  const [state, dispatch] = useReducer(simulationReducer, INITIAL_STATE);

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
          <Canvas
            grid={state.grid}
            running={state.running}
            onToggleCell={(x, y) =>
              dispatch({ type: 'toggleCell', x, y })
            }
          />
        </div>
      </div>
    </main>
  );
}
