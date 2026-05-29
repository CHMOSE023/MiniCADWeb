import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sharedAssetsDir = path.resolve(__dirname, 'assets');

function copyDirSync(src: string, dst: string) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDirSync(s, d);
    else fs.copyFileSync(s, d);
  }
}

const MIME: Record<string, string> = {
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.shx': 'application/octet-stream',
};

const sharedAssetsPlugin = {
  name: 'shared-assets',
  configureServer(server: import('vite').ViteDevServer) {
    server.middlewares.use((req: import('http').IncomingMessage, res: import('http').ServerResponse, next: () => void) => {
      const url = (req.url ?? '/').split('?')[0];
      const filePath = path.join(sharedAssetsDir, url);
      try {
        if (fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath).toLowerCase();
          res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream');
          res.end(fs.readFileSync(filePath));
          return;
        }
      } catch { /* not found, fall through */ }
      next();
    });
  },
  writeBundle({ dir }: { dir?: string }) {
    if (dir) copyDirSync(sharedAssetsDir, dir);
  },
};

const WASM_FILES = ['minicad.js', 'minicad.wasm', 'minicad.data'];

const copyWasmPlugin = {
  name: 'copy-wasm',
  closeBundle() {
    const src = path.resolve(__dirname, 'public');
    const dst = path.resolve(__dirname, 'dist-lib/wasm');
    fs.mkdirSync(dst, { recursive: true });
    for (const f of WASM_FILES) {
      const srcFile = path.join(src, f);
      if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, path.join(dst, f));
        console.log(`  copied → dist-lib/wasm/${f}`);
      } else {
        console.warn(`  WARN: ${f} not found in public/ — run build_wasm.bat first`);
      }
    }
  },
};

export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib';

  return {
    root: isLib ? undefined : '.',
    publicDir: isLib ? false : 'public',
    plugins: [
      glsl(),
      ...(isLib ? [copyWasmPlugin] : [sharedAssetsPlugin]),
    ],
    build: isLib ? {
      lib: {
        entry: path.resolve(__dirname, 'src/index.ts'),
        name: 'MiniCAD',
        formats: ['es', 'cjs'],
        fileName: (fmt) => `minicad.${fmt}.js`,
      },
      outDir: 'dist-lib',
      emptyOutDir: true,
      target: 'es2020',
      cssCodeSplit: false,
    } : {
      outDir: 'dist',
      emptyOutDir: true,
      target: 'es2020',
    },
    server: {
      port: 8080,
    },
    optimizeDeps: {
      exclude: ['minicad'],
    },
  };
});
