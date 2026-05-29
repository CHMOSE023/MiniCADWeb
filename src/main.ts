import { loadMiniCADModule } from './Engine/MiniCADModule';
import { MiniCADApi } from './Engine/MiniCADApi';
import { App } from './App';
import './Styles/index.css';

async function main() {
  const loadingEl = document.getElementById('loading');

  try {

    if (loadingEl) loadingEl.textContent = '正在加载 MiniCAD ';

    const module = await loadMiniCADModule();
    if (!module) {
      if (loadingEl) {
        loadingEl.textContent = 'WASM 尚未构建，请先运行 build_wasm.bat';
        loadingEl.style.color = 'var(--warn)';
      }
      return;
    }

    const api = new MiniCADApi(module);

    loadingEl?.remove();

    const container = document.getElementById('app')!;
    const app = new App(api, container);
    app.start();

    (window as unknown as Record<string, unknown>)._minicad = { api, app };
  } catch (err) {
    console.error('MiniCAD init failed:', err);
    if (loadingEl) {
      loadingEl.textContent = `初始化失败: ${err instanceof Error ? err.message : String(err)}`;
      loadingEl.style.color = '#ff6b6b';
    }
  }
}

main();
