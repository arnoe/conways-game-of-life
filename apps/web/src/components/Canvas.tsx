'use client';

import { useEffect, useRef, type PointerEvent } from 'react';
import type { Grid } from '@cgol-scaffold/sim';
import { ALIVE_COLOR, CELL_SIZE, DEAD_COLOR } from '../app/constants.js';
import styles from './Canvas.module.css';

interface CanvasProps {
  grid: Grid;
  running: boolean;
  onToggleCell: (x: number, y: number) => void;
}

export function Canvas({
  grid,
  running,
  onToggleCell,
}: CanvasProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr =
      typeof window !== 'undefined' && window.devicePixelRatio
        ? window.devicePixelRatio
        : 1;
    const cssW = grid.width * CELL_SIZE;
    const cssH = grid.height * CELL_SIZE;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = DEAD_COLOR;
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.fillStyle = ALIVE_COLOR;
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (grid.cells[y * grid.width + x] === 1) {
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      }
    }
  }, [grid]);

  const handlePointerDown = (e: PointerEvent<HTMLCanvasElement>): void => {
    if (running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    if (cssX < 0 || cssY < 0 || cssX >= rect.width || cssY >= rect.height) {
      return;
    }
    const cellSizeFromRect = rect.width / grid.width;
    if (cellSizeFromRect <= 0) return;
    const gx = Math.floor(cssX / cellSizeFromRect);
    const gy = Math.floor(cssY / cellSizeFromRect);
    if (gx < 0 || gx >= grid.width || gy < 0 || gy >= grid.height) return;
    onToggleCell(gx, gy);
  };

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      aria-label="Conway grid (click cells to toggle alive/dead)"
      data-testid="canvas"
    />
  );
}
