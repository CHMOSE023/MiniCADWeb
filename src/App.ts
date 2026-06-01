import { MiniCADApi } from './Engine/MiniCADApi';
import { WebGLRenderer } from './Engine/WebGLRenderer';
import { GlyphAtlas } from './Engine/GlyphAtlas';
import { InputBridge } from './Engine/InputBridge';
import { Toolbar } from './Components/Toolbar';
import { StatusBar } from './Components/StatusBar';
import { CommandLine } from './Components/CommandLine';
import { TextInputOverlay } from './Components/TextInputOverlay';
import { PerfMonitor } from './Components/PerfMonitor';

export class App {
  private api: MiniCADApi;
  private canvas: HTMLCanvasElement;
  private renderer: WebGLRenderer;
  private atlas: GlyphAtlas;
  private bridge: InputBridge;
  private statusBar: StatusBar;
  private cmdLine: CommandLine;
  private textOverlay: TextInputOverlay;
  private perf: PerfMonitor;
  private rafId = 0;
  private rafPending = false;
  private heartbeatId = 0;
  private dpr = 1;
  private wasmInited = false;

  constructor(api: MiniCADApi, container: HTMLElement | ShadowRoot) {
    this.api = api;

    const { toolbar, canvasWrap, canvas, perfMount, status } = App.buildShell(container);
    this.canvas = canvas;

    const gl = this.canvas.getContext('webgl2', { antialias: false, depth: false });
    if (!gl) throw new Error('WebGL2 is not available in this browser.');

    this.renderer = new WebGLRenderer(gl);
    this.atlas = new GlyphAtlas(gl);
    this.bridge = new InputBridge(api, this.canvas, () => this.markDirty());
    api.setMarkDirty(() => this.markDirty());
    new Toolbar(api, toolbar);
    this.statusBar = new StatusBar(api, status);
    this.cmdLine = new CommandLine(api, canvasWrap);
    this.textOverlay = new TextInputOverlay(api, canvasWrap);
    this.perf = new PerfMonitor(perfMount);

    // Backtick toggles the perf monitor before WASM sees the key.
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Backquote') {
        e.stopPropagation();
        e.preventDefault();
        this.perf.toggle();
      }
    }, { capture: true });

    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    window.addEventListener('resize', () => { this.resize(); this.markDirty(); });
  }

  private static buildShell(container: HTMLElement | ShadowRoot) {
    const toolbar = document.createElement('div');
    toolbar.id = 'toolbar';

    const canvas = document.createElement('canvas');
    canvas.id = 'gl';
    canvas.tabIndex = 0;

    const perfMount = document.createElement('div');
    perfMount.id = 'perf-monitor';

    const canvasWrap = document.createElement('div');
    canvasWrap.id = 'canvas-wrap';
    canvasWrap.append(canvas, perfMount);

    const status = document.createElement('div');
    status.id = 'status';

    container.append(toolbar, canvasWrap, status);
    return { toolbar, canvasWrap, canvas, perfMount, status };
  }

  start() {
    // 低频刷新机制：用于驱动 WASM 内部更新（如吸附提示、状态轮询等）
    this.heartbeatId = window.setInterval(() => this.markDirty(), 10000); //  10000 ~0.1 fps | 33  ~30 fps
    this.markDirty(); // First render
  }

  stop() {
    window.clearInterval(this.heartbeatId);
    cancelAnimationFrame(this.rafId);
    this.bridge.dispose();
  }

  markDirty() {
    if (this.rafPending) return;
    this.rafPending = true;
    this.rafId = requestAnimationFrame((ts) => {
      this.rafPending = false;
      const t0 = performance.now();
      this.frame();
      const jsMs = performance.now() - t0;
      this.perf.recordFrame(ts, jsMs, this.renderer.getLastGpuMs());
    });
  }

  private resize() {
    const wrap = this.canvas.parentElement!;
    const w = Math.round(wrap.clientWidth * this.dpr);
    const h = Math.round(wrap.clientHeight * this.dpr);
    if (this.canvas.width === w && this.canvas.height === h) return;

    this.canvas.width = w;
    this.canvas.height = h;

    if (!this.wasmInited) {
      this.api.init(w, h);
      this.wasmInited = true;
    } else {
      this.api.resize(w, h);
    }
  }

  private frame() {
    if (!this.wasmInited) return;

    const newDpr = window.devicePixelRatio || 1;
    if (newDpr !== this.dpr) {
      this.dpr = newDpr;
      this.resize();
    }

    this.api.tick();
    this.atlas.flush();

    const screenLines = this.api.getScreenLineVerts();
    const screenTris = this.api.getScreenTriVerts();
    const worldLines = this.api.getWorldLineVerts();
    const textVerts = this.api.getTextVerts();
    const screenVPRaw = this.api.getScreenVP();
    const worldVPRaw = this.api.getWorldVP();

    this.renderer.beginFrame(this.canvas.width, this.canvas.height);
    this.renderer.beginGpuFrame();

    if (screenVPRaw) {
      if (screenTris.length > 0) this.renderer.drawTriangles(screenTris, screenVPRaw);
      if (screenLines.length > 0) this.renderer.drawLines(screenLines, screenVPRaw);
    }

    if (worldVPRaw && worldLines.length > 0) this.renderer.drawLines(worldLines, worldVPRaw);
    if (worldVPRaw && textVerts.length > 0) this.renderer.drawText(textVerts, worldVPRaw, this.atlas.getTexture());

    this.renderer.endGpuFrame();

    this.statusBar.update();
    this.cmdLine.update();
    this.textOverlay.update();
  }
}
