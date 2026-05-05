import '@testing-library/jest-dom';

/**
 * jsdom 26 (and earlier) does not implement `PointerEvent`. React's synthetic
 * events for `onPointerDown` rely on the browser's PointerEvent carrying
 * `clientX`/`clientY`, so without a polyfill `fireEvent.pointerDown(node, init)`
 * silently drops those fields (the fallback `Event` constructor ignores
 * unknown init keys). The shim below gives jsdom a minimal `PointerEvent`
 * subclass of `MouseEvent` so `clientX`/`clientY` round-trip correctly.
 */
// We deliberately type this through `unknown` so a partial polyfill can
// satisfy jsdom + RTL without having to implement every modern PointerEvent
// member (altitudeAngle, getCoalescedEvents, etc.).
const globalRef = globalThis as unknown as { PointerEvent?: unknown };
if (typeof globalRef.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    public readonly pointerId: number;
    public readonly width: number;
    public readonly height: number;
    public readonly pressure: number;
    public readonly tangentialPressure: number;
    public readonly tiltX: number;
    public readonly tiltY: number;
    public readonly twist: number;
    public readonly pointerType: string;
    public readonly isPrimary: boolean;

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
      this.width = params.width ?? 1;
      this.height = params.height ?? 1;
      this.pressure = params.pressure ?? 0;
      this.tangentialPressure = params.tangentialPressure ?? 0;
      this.tiltX = params.tiltX ?? 0;
      this.tiltY = params.tiltY ?? 0;
      this.twist = params.twist ?? 0;
      this.pointerType = params.pointerType ?? '';
      this.isPrimary = params.isPrimary ?? false;
    }
  }
  globalRef.PointerEvent = PointerEventPolyfill;
}
