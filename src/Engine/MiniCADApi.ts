// Strongly-typed wrapper over the raw Emscripten exports.
// Converts between JS types and WASM heap pointers.

import type { MiniCADModuleType } from './MiniCADModule';

export class MiniCADApi {
  private m: MiniCADModuleType;
  private _tmpStrBuf = 0;
  private _tmpStrLen = 256;
  private _markDirty: (() => void) | null = null;

  constructor(module: MiniCADModuleType) {
    this.m = module;
    this._tmpStrBuf = module._malloc(this._tmpStrLen);
  }

  setMarkDirty(callback: () => void) {
    this._markDirty = callback;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  init(w: number, h: number) { this.m._MiniCAD_Init(w, h); }
  resize(w: number, h: number) { this.m._MiniCAD_Resize(w, h); }
  tick() { this.m._MiniCAD_Tick(); }

  // ── Input ─────────────────────────────────────────────────────────────────
  mouseMove(x: number, y: number, btns: number, mods: number) {
    this.m._MiniCAD_MouseMove(x, y, btns, mods);
  }
  mouseDown(x: number, y: number, btn: number, mods: number) {
    this.m._MiniCAD_MouseDown(x, y, btn, mods);
  }
  mouseUp(x: number, y: number, btn: number, mods: number) {
    this.m._MiniCAD_MouseUp(x, y, btn, mods);
  }
  wheel(delta: number, mods: number) {
    this.m._MiniCAD_Wheel(delta, mods);
  }
  keyDown(code: string, mods: number) {
    this._writeStr(code);
    this.m._MiniCAD_KeyDown(this._tmpStrBuf, mods);
  }
  keyUp(code: string, mods: number) {
    this._writeStr(code);
    this.m._MiniCAD_KeyUp(this._tmpStrBuf, mods);
  }
  runCommand(text: string) {
    const buf = this._allocStr(text);
    this.m._MiniCAD_RunCommand(buf);
    this.m._free(buf);
  }

  // ── Vertex read-back (zero-copy views into WASM heap) ────────────────────

  getScreenLineVerts(): Float32Array {
    const ptr = this.m._MiniCAD_GetScreenLineData();
    const count = this.m._MiniCAD_GetScreenLineCount();
    return count > 0 ? new Float32Array(this.m.HEAPF32.buffer, ptr, count * 7) : new Float32Array(0);
  }

  getScreenTriVerts(): Float32Array {
    const ptr = this.m._MiniCAD_GetScreenTriData();
    const count = this.m._MiniCAD_GetScreenTriCount();
    return count > 0 ? new Float32Array(this.m.HEAPF32.buffer, ptr, count * 7) : new Float32Array(0);
  }

  getWorldLineVerts(): Float32Array {
    const ptr = this.m._MiniCAD_GetWorldLineData();
    const count = this.m._MiniCAD_GetWorldLineCount();
    return count > 0 ? new Float32Array(this.m.HEAPF32.buffer, ptr, count * 7) : new Float32Array(0);
  }

  getTextVerts(): Float32Array {
    const ptr = this.m._MiniCAD_GetTextData();
    const count = this.m._MiniCAD_GetTextCount();
    return count > 0 ? new Float32Array(this.m.HEAPF32.buffer, ptr, count * 9) : new Float32Array(0);
  }

  // Returns the 4×4 matrix as a Float32Array[16] (row-major, needs transpose for WebGL)
  getScreenVP(): Float32Array | null {
    const ptr = this.m._MiniCAD_GetScreenVP();
    return ptr ? new Float32Array(this.m.HEAPF32.buffer, ptr, 16) : null;
  }

  getWorldVP(): Float32Array | null {
    const ptr = this.m._MiniCAD_GetWorldVP();
    return ptr ? new Float32Array(this.m.HEAPF32.buffer, ptr, 16) : null;
  }

  // ── Font texture ──────────────────────────────────────────────────────────
  setFontTexId(id: number) { this.m._MiniCAD_SetFontTexId(id); }

  // ── UI state ──────────────────────────────────────────────────────────────
  getPrompt(): string {
    const ptr = this.m._MiniCAD_GetPrompt();
    return ptr ? this.m.UTF8ToString(ptr) : '';
  }

  getLines(): string[] {
    const n = this.m._MiniCAD_GetLineCount();
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      const ptr = this.m._MiniCAD_GetLine(i);
      out.push(this.m.UTF8ToString(ptr));
    }
    return out;
  }

  consumeScrollToBottom(): boolean {
    return this.m._MiniCAD_ConsumeScrollToBottom() !== 0;
  }

  getMouseWorldX(): number { return this.m._MiniCAD_GetMouseWorldX(); }
  getMouseWorldY(): number { return this.m._MiniCAD_GetMouseWorldY(); }

  // ── Tools ─────────────────────────────────────────────────────────────────
  startLine() { this.m._MiniCAD_StartLine(); }
  startPoint() { this.m._MiniCAD_StartPoint(); }
  startRect() { this.m._MiniCAD_StartRect(); }
  startCircle() { this.m._MiniCAD_StartCircle(); }
  startArc() { this.m._MiniCAD_StartArc(); }
  startEllipse() { this.m._MiniCAD_StartEllipse(); }
  startPolyline() { this.m._MiniCAD_StartPolyline(); }
  startSpline() { this.m._MiniCAD_StartSpline(); }
  startText() { this.m._MiniCAD_StartText(); }
  startMText() { this.m._MiniCAD_StartMText(); }
  startMove() { this.m._MiniCAD_StartMove(); }
  startCopy() { this.m._MiniCAD_StartCopy(); }
  startMirror() { this.m._MiniCAD_StartMirror(); }
  startRotate() { this.m._MiniCAD_StartRotate(); }
  deleteSelected() { this.m._MiniCAD_DeleteSelected(); }
  undo() { this.m._MiniCAD_Undo(); this._markDirty?.(); }
  redo() { this.m._MiniCAD_Redo(); this._markDirty?.(); }

  isSnapEnabled(): boolean { return this.m._MiniCAD_IsSnapEnabled() !== 0; }
  isOrthoEnabled(): boolean { return this.m._MiniCAD_IsOrthoEnabled() !== 0; }
  toggleSnap() { this.m._MiniCAD_ToggleSnap(); }
  toggleOrtho() { this.m._MiniCAD_ToggleOrtho(); }

  isTextInputActive(): boolean { return this.m._MiniCAD_IsTextInputActive() !== 0; }
  isMTextInputActive(): boolean { return this.m._MiniCAD_IsMTextInputActive() !== 0; }
  submitTextInput(utf8: string) { const b = this._allocStr(utf8); this.m._MiniCAD_SubmitTextInput(b); this.m._free(b); }
  submitMTextInput(utf8: string) { const b = this._allocStr(utf8); this.m._MiniCAD_SubmitMTextInput(b); this.m._free(b); }

  // ── Private helpers ───────────────────────────────────────────────────────
  private _writeStr(s: string) {
    const needed = this.m.lengthBytesUTF8(s) + 1;
    if (needed > this._tmpStrLen) {
      this.m._free(this._tmpStrBuf);
      this._tmpStrLen = needed * 2;
      this._tmpStrBuf = this.m._malloc(this._tmpStrLen);
    }
    this.m.stringToUTF8(s, this._tmpStrBuf, this._tmpStrLen);
  }

  private _allocStr(s: string): number {
    const len = this.m.lengthBytesUTF8(s) + 1;
    const buf = this.m._malloc(len);
    this.m.stringToUTF8(s, buf, len);
    return buf;
  }
}
