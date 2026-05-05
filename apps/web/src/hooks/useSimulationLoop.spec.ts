import { act, renderHook } from '@testing-library/react';
import { useSimulationLoop } from './useSimulationLoop';

describe('useSimulationLoop — running=false', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not call onTick when running=false', () => {
    const onTick = jest.fn();
    renderHook(() =>
      useSimulationLoop({ running: false, genPerSec: 10, onTick }),
    );
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onTick).not.toHaveBeenCalled();
  });
});

describe('useSimulationLoop — running=true at 10 gen/sec', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls onTick approximately 10 times per 1000ms', () => {
    const onTick = jest.fn();
    renderHook(() =>
      useSimulationLoop({ running: true, genPerSec: 10, onTick }),
    );
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onTick.mock.calls.length).toBeGreaterThanOrEqual(9);
    expect(onTick.mock.calls.length).toBeLessThanOrEqual(11);
  });

  it('AC-1: 5 ticks fire in 500ms at 10 gen/sec (within tolerance)', () => {
    const onTick = jest.fn();
    renderHook(() =>
      useSimulationLoop({ running: true, genPerSec: 10, onTick }),
    );
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(onTick.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(onTick.mock.calls.length).toBeLessThanOrEqual(6);
  });
});

describe('useSimulationLoop — pause behavior (AC-2)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('AC-2: stopping (running=false) cancels rAF and onTick is not called subsequently', () => {
    const onTick = jest.fn();
    const { rerender } = renderHook(
      (props: { running: boolean }) =>
        useSimulationLoop({
          running: props.running,
          genPerSec: 10,
          onTick,
        }),
      { initialProps: { running: true } },
    );
    act(() => {
      jest.advanceTimersByTime(500);
    });
    const beforePauseCalls = onTick.mock.calls.length;
    rerender({ running: false });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onTick.mock.calls.length).toBe(beforePauseCalls);
  });
});

describe('useSimulationLoop — Story 3.5 hand-off (ref-fresh genPerSec)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('reads genPerSec via a ref so changes mid-run change cadence without rebuild', () => {
    const onTick = jest.fn();
    const { rerender } = renderHook(
      (props: { genPerSec: number }) =>
        useSimulationLoop({
          running: true,
          genPerSec: props.genPerSec,
          onTick,
        }),
      { initialProps: { genPerSec: 10 } },
    );
    act(() => {
      jest.advanceTimersByTime(500);
    });
    const callsAt10 = onTick.mock.calls.length;
    rerender({ genPerSec: 30 });
    act(() => {
      jest.advanceTimersByTime(500);
    });
    const totalCalls = onTick.mock.calls.length;
    const callsAfterChange = totalCalls - callsAt10;
    // At 30 gen/sec for 500ms we expect ~15 ticks; allow ±4 tolerance.
    expect(callsAfterChange).toBeGreaterThanOrEqual(11);
    expect(callsAfterChange).toBeLessThanOrEqual(19);
  });
});
