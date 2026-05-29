import type { MiniCADApi } from './MiniCADApi';

// Converts DOM events on the canvas to MiniCAD InputEvent calls.

function buildMods(e: MouseEvent | KeyboardEvent): number {
  let m = 0;
  if (e.shiftKey) m |= 1; // Shift = 1<<0
  if (e.ctrlKey) m |= 2; // Ctrl  = 1<<1
  if (e.altKey) m |= 4; // Alt   = 1<<2
  return m;
}

function buildMouseButtons(e: MouseEvent): number {
  // e.buttons bitmask: 1=left, 4=middle, 2=right → matches MouseButtonState
  let b = 0;
  if (e.buttons & 1) b |= 1; // Left
  if (e.buttons & 4) b |= 2; // Middle
  if (e.buttons & 2) b |= 4; // Right
  return b;
}

function canvasCoords(canvas: HTMLCanvasElement, e: MouseEvent): [number, number] {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  return [
    Math.round((e.clientX - rect.left) * dpr),
    Math.round((e.clientY - rect.top) * dpr),
  ];
}

export class InputBridge {
  private api: MiniCADApi;
  private canvas: HTMLCanvasElement;
  private markDirty: () => void;
  private cleanup: (() => void)[] = [];

  constructor(api: MiniCADApi, canvas: HTMLCanvasElement, markDirty: () => void) {
    this.api = api;
    this.canvas = canvas;
    this.markDirty = markDirty;
    this._attach();
  }

  private on<K extends keyof HTMLElementEventMap>(
    target: EventTarget,
    type: K,
    handler: (e: HTMLElementEventMap[K]) => void,
    opts?: AddEventListenerOptions,
  ) {
    target.addEventListener(type, handler as EventListener, opts);
    this.cleanup.push(() => target.removeEventListener(type, handler as EventListener, opts));
  }

  private _attach() {
    const { canvas, api, markDirty } = this;

    this.on(canvas, 'pointermove', (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      const [x, y] = canvasCoords(canvas, e);
      api.mouseMove(x, y, buildMouseButtons(e), buildMods(e));
      markDirty();
    });

    this.on(canvas, 'pointerdown', (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      const [x, y] = canvasCoords(canvas, e);
      api.mouseDown(x, y, e.button, buildMods(e));
      markDirty();
    });

    this.on(canvas, 'pointerup', (e: PointerEvent) => {
      const [x, y] = canvasCoords(canvas, e);
      api.mouseUp(x, y, e.button, buildMods(e));
      markDirty();
    });

    this.on(canvas, 'pointercancel', (e: PointerEvent) => {
      const [x, y] = canvasCoords(canvas, e);
      api.mouseUp(x, y, e.button, 0);
      markDirty();
    });

    this.on(canvas, 'wheel', (e: WheelEvent) => {
      e.preventDefault();
      // normalise delta: positive = zoom in, negative = zoom out
      const delta = e.deltaMode === WheelEvent.DOM_DELTA_PIXEL
        ? -e.deltaY / 100
        : e.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? -e.deltaY / 3
          : -e.deltaY;
      api.wheel(delta, buildMods(e));
      markDirty();
    }, { passive: false });

    this.on(canvas, 'contextmenu', (e: MouseEvent) => {
      e.preventDefault();
    });

    // Keyboard: attach to window so shortcuts work even when canvas doesn't have focus
    this.on(window, 'keydown', (e: KeyboardEvent) => {
      // Let browser handle F5/F12 etc. and browser shortcuts
      if (e.ctrlKey && (e.code === 'KeyR' || e.code === 'KeyW' || e.code === 'Tab')) return;
      if (e.code === 'F5' || e.code === 'F12') return;
      e.preventDefault();
      api.keyDown(e.code, buildMods(e));
      markDirty();
    });

    this.on(window, 'keyup', (e: KeyboardEvent) => {
      api.keyUp(e.code, buildMods(e));
      markDirty();
    });
  }

  dispose() {
    for (const fn of this.cleanup) fn();
    this.cleanup = [];
  }
}
