import { App } from './App';
import { MiniCADApi } from './Engine/MiniCADApi';
import { loadMiniCADModule } from './Engine/MiniCADModule';
import type { MiniCADModuleType } from './Engine/MiniCADModule';
import componentCSS from './Styles/component.css?inline';

type ModuleFactory = () => Promise<MiniCADModuleType>;

let globalFactory: ModuleFactory | null = null;

/**
 * Call this before using <minicad-editor> to supply the WASM module factory.
 * In a Vite app you can also load minicad.js as a <script> tag beforehand.
 *
 * @example
 * import { setModuleFactory } from 'minicad-web';
 * setModuleFactory(() => import('/minicad.js').then(m => m.default()));
 */
export function setModuleFactory(factory: ModuleFactory) {
  globalFactory = factory;
}

export class MiniCADEditorElement extends HTMLElement {
  private app: App | null = null;
  private shadow: ShadowRoot;

  static get observedAttributes() {
    return ['assets-base'];
  }

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    // Inject Shadow DOM styles
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(componentCSS);
    this.shadow.adoptedStyleSheets = [sheet];

    // Loading indicator
    const loading = document.createElement('div');
    loading.id = 'loading';
    loading.textContent = '正在加载 MiniCAD…';
    this.shadow.appendChild(loading);

    this._init(loading);
  }

  disconnectedCallback() {
    this.app?.stop();
    this.app = null;
    this.shadow.adoptedStyleSheets = [];
  }

  /** Programmatic API access after initialization */
  get api(): MiniCADApi | null {
    return (this.app as unknown as { api: MiniCADApi } | null)?.api ?? null;
  }

  private async _init(loading: HTMLElement) {
    try {
      const factory = globalFactory ?? undefined;
      const module = await loadMiniCADModule(factory);
      const api = new MiniCADApi(module);

      loading.remove();

      this.app = new App(api, this.shadow);
      this.app.start();

      this.dispatchEvent(new CustomEvent('minicad:ready', { bubbles: true, composed: true, detail: { api } }));
    } catch (err) {
      loading.textContent = `初始化失败: ${err instanceof Error ? err.message : String(err)}`;
      loading.style.color = '#ff6b6b';
      this.dispatchEvent(new CustomEvent('minicad:error', { bubbles: true, composed: true, detail: { error: err } }));
    }
  }
}

customElements.define('minicad-editor', MiniCADEditorElement);
