// Headless core — works in any framework
export { MiniCADApi } from './Engine/MiniCADApi';
export { loadMiniCADModule, createWasmFactory } from './Engine/MiniCADModule';
export type { MiniCADModuleType } from './Engine/MiniCADModule';

// Full-featured Web Component — registers <minicad-editor>
export { MiniCADEditorElement, setModuleFactory } from './MiniCADEditor';

// App class for advanced custom embedding
export { App } from './App';
