export interface MiniCADModuleType {
  ccall(
    ident: string,
    returnType: 'number' | 'string' | 'boolean' | null,
    argTypes: Array<'number' | 'string' | 'boolean' | 'array'>,
    args: unknown[]
  ): unknown;

  cwrap(
    ident: string,
    returnType: 'number' | 'string' | 'boolean' | null,
    argTypes: Array<'number' | 'string' | 'boolean' | 'array'>
  ): (...args: unknown[]) => unknown;

  UTF8ToString(ptr: number): string;
  stringToUTF8(str: string, buf: number, len: number): void;
  lengthBytesUTF8(str: string): number;

  HEAPF32: Float32Array;
  HEAP32: Int32Array;
  HEAPU8: Uint8Array;

  _MiniCAD_Init(w: number, h: number): void;
  _MiniCAD_Resize(w: number, h: number): void;
  _MiniCAD_Tick(): void;
  _MiniCAD_MouseMove(x: number, y: number, btns: number, mods: number): void;
  _MiniCAD_MouseDown(x: number, y: number, btn: number, mods: number): void;
  _MiniCAD_MouseUp(x: number, y: number, btn: number, mods: number): void;
  _MiniCAD_Wheel(delta: number, mods: number): void;
  _MiniCAD_KeyDown(codePtr: number, mods: number): void;
  _MiniCAD_KeyUp(codePtr: number, mods: number): void;
  _MiniCAD_RunCommand(textPtr: number): void;
  _MiniCAD_GetScreenLineData(): number;
  _MiniCAD_GetScreenLineCount(): number;
  _MiniCAD_GetScreenTriData(): number;
  _MiniCAD_GetScreenTriCount(): number;
  _MiniCAD_GetWorldLineData(): number;
  _MiniCAD_GetWorldLineCount(): number;
  _MiniCAD_GetTextData(): number;
  _MiniCAD_GetTextCount(): number;
  _MiniCAD_GetScreenVP(): number;
  _MiniCAD_GetWorldVP(): number;
  _MiniCAD_SetFontTexId(id: number): void;
  _MiniCAD_GetFontTexId(): number;
  _MiniCAD_GetPrompt(): number;
  _MiniCAD_GetLineCount(): number;
  _MiniCAD_GetLine(i: number): number;
  _MiniCAD_ConsumeScrollToBottom(): number;
  _MiniCAD_StartLine(): void;
  _MiniCAD_StartPoint(): void;
  _MiniCAD_StartRect(): void;
  _MiniCAD_StartCircle(): void;
  _MiniCAD_StartArc(): void;
  _MiniCAD_StartEllipse(): void;
  _MiniCAD_StartPolyline(): void;
  _MiniCAD_StartSpline(): void;
  _MiniCAD_StartText(): void;
  _MiniCAD_StartMText(): void;
  _MiniCAD_StartMove(): void;
  _MiniCAD_StartCopy(): void;
  _MiniCAD_StartMirror(): void;
  _MiniCAD_StartRotate(): void;
  _MiniCAD_DeleteSelected(): void;
  _MiniCAD_Undo(): void;
  _MiniCAD_Redo(): void;
  _MiniCAD_IsSnapEnabled(): number;
  _MiniCAD_IsOrthoEnabled(): number;
  _MiniCAD_ToggleSnap(): void;
  _MiniCAD_ToggleOrtho(): void;
  _MiniCAD_IsTextInputActive(): number;
  _MiniCAD_IsMTextInputActive(): number;
  _MiniCAD_SubmitTextInput(ptr: number): void;
  _MiniCAD_SubmitMTextInput(ptr: number): void;
  _MiniCAD_GetMouseWorldX(): number;
  _MiniCAD_GetMouseWorldY(): number;

  _malloc(size: number): number;
  _free(ptr: number): void;
}

// declare 实现不在当前文件里
declare function createMiniCADModule(options?: object): Promise<MiniCADModuleType>;

export async function loadMiniCADModule(
  factory?: () => Promise<MiniCADModuleType>,
): Promise<MiniCADModuleType> {
  const fn = factory
    ?? (window as unknown as { createMiniCADModule?: typeof createMiniCADModule }).createMiniCADModule;
  if (!fn) {
    throw new Error('No WASM factory found. Load minicad.js via <script> or call setModuleFactory() first.');
  }
  return fn();
}

/**
 * 创建一个从指定 base URL 加载 WASM 的 factory，传给 setModuleFactory()。
 *
 * @param wasmBase  WASM 文件所在目录的 URL，以 `/` 结尾。
 *                  例如 '/wasm/'  或  'https://cdn.example.com/minicad/wasm/'
 *
 * @example
 * import { setModuleFactory, createWasmFactory } from '@chmose023/minicad-web';
 * setModuleFactory(createWasmFactory('/wasm/'));
 */
export function createWasmFactory(wasmBase: string): () => Promise<MiniCADModuleType> {
  const base = wasmBase.endsWith('/') ? wasmBase : wasmBase + '/';
  return async () => {
    await _loadScript(base + 'minicad.js');
    const factory = (window as unknown as { createMiniCADModule?: typeof createMiniCADModule }).createMiniCADModule;
    if (!factory) throw new Error(`createMiniCADModule not found after loading ${base}minicad.js`);
    return factory({ locateFile: (f: string) => base + f });
  };
}

function _loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(s);
  });
}
