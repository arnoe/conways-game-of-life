'use client';

import { useReducer } from 'react';
import { Canvas } from '../components/Canvas';
import { Controls } from '../components/Controls';
import { GridSizeForm } from '../components/GridSizeForm';
import { SpeedSlider } from '../components/SpeedSlider';
import { useSimulationLoop } from '../hooks/useSimulationLoop';
import {
  INITIAL_STATE,
  simulationReducer,
} from './state/simulation-state';
import styles from './page.module.css';

export default function Index(): React.JSX.Element {
  const [state, dispatch] = useReducer(simulationReducer, INITIAL_STATE);

  useSimulationLoop({
    running: state.running,
    genPerSec: state.genPerSec,
    onTick: () => dispatch({ type: 'tick' }),
  });

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Conway&apos;s Game of Life</h1>
      <div className={styles.layout}>
        <div className={styles.formArea}>
          <GridSizeForm
            width={state.dimensions.width}
            height={state.dimensions.height}
            onResize={({ width, height }) =>
              dispatch({ type: 'setSize', width, height })
            }
          />
        </div>
        <div className={styles.canvasArea}>
          <Canvas
            grid={state.grid}
            running={state.running}
            onToggleCell={(x, y) =>
              dispatch({ type: 'toggleCell', x, y })
            }
          />
        </div>
        <div className={styles.controlsArea}>
          <Controls
            running={state.running}
            genCount={state.genCount}
            onPlay={() => dispatch({ type: 'play' })}
            onPause={() => dispatch({ type: 'pause' })}
            onStep={() => dispatch({ type: 'step' })}
            onClear={() => dispatch({ type: 'clear' })}
            onRandomize={() => dispatch({ type: 'randomize' })}
          />
          <SpeedSlider
            genPerSec={state.genPerSec}
            onChange={(genPerSec) =>
              dispatch({ type: 'setGenPerSec', genPerSec })
            }
          />
        </div>
      </div>
    </main>
  );
}
