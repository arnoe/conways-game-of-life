'use client';

import { useEffect, useRef } from 'react';

/**
 * rAF + accumulator simulation loop driver.
 *
 * Owns the `requestAnimationFrame` callback chain. Each frame, it accumulates
 * elapsed time and dispatches `onTick()` once per `1000 / genPerSec` ms
 * elapsed. The rate (`genPerSec`) and the tick callback are read from refs
 * each frame so updates do NOT tear down the rAF loop — `running` is the
 * sole `useEffect` dependency. This is the load-bearing pattern for
 * Story 3.5's mid-run slider change without restart (project-context #6).
 */
export interface UseSimulationLoopOptions {
  running: boolean;
  genPerSec: number;
  onTick: () => void;
}

export function useSimulationLoop({
  running,
  genPerSec,
  onTick,
}: UseSimulationLoopOptions): void {
  const genPerSecRef = useRef<number>(genPerSec);
  const onTickRef = useRef<() => void>(onTick);

  // Refresh refs every render — no `useEffect` boundary so the values are
  // already up to date by the time the next rAF callback fires.
  genPerSecRef.current = genPerSec;
  onTickRef.current = onTick;

  useEffect(() => {
    if (!running) return;

    let rafId: number | null = null;
    let lastTime = performance.now();
    let accumulator = 0;

    const tick = (now: number): void => {
      const dt = now - lastTime;
      lastTime = now;
      accumulator += dt;
      const interval = 1000 / Math.max(1, genPerSecRef.current);
      while (accumulator >= interval) {
        onTickRef.current();
        accumulator -= interval;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
  }, [running]);
}
