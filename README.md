# MiniCAD Web

轻量级浏览器端 2D CAD 引擎 —— WebAssembly 核心 + WebGL2 渲染，框架无关的 Web Component。

**npm 包名：** `@minicad-web` · **运行要求：** WebGL2、现代浏览器

---

## 功能特性

- 绘图工具：直线、点、矩形、圆、圆弧、椭圆、多段线、样条曲线、单行文字、多行文字
- 编辑操作：移动、复制、镜像、旋转、删除
- 捕捉约束与正交模式，支持撤销 / 重做
- 以标准 HTML Web Component（`<minicad-editor>`）形式嵌入
- 兼容 React、Vue、Angular 及原生 HTML

---

## 安装

```bash
npm install minicad-web
```

包内附带三个 WASM 文件，位于 `node_modules/minicad-web/dist-lib/wasm/`，**必须作为静态资源对外提供**，请将它们复制到项目的公共目录：

```
minicad.js
minicad.wasm
minicad.data
```

---

## 使用方式

### 方式一 — Web Component（推荐）

加载 WASM 胶合脚本后，直接使用自定义元素：

```html
<!-- 1. 加载 WASM 胶合脚本（需静态托管） -->
<script src="/wasm/minicad.js"></script>

<!-- 2. 引入库 -->
<script type="module">
  import "minicad-web";
</script>

<!-- 3. 使用元素 -->
<minicad-editor style="width: 100%; height: 600px;"></minicad-editor>
```

**监听事件**

```js
const editor = document.querySelector("minicad-editor");

editor.addEventListener("minicad:ready", (e) => {
  console.log("初始化完成", e.detail.api);
});

editor.addEventListener("minicad:error", (e) => {
  console.error("初始化失败", e.detail.error);
});
```

**通过 `.api` 调用接口**

```js
editor.addEventListener("minicad:ready", () => {
  const api = editor.api; // MiniCADApi 实例
  api.startLine();
});
```

---

### 方式二 — 自定义 WASM 路径

当 WASM 文件无法放在根路径时，使用 `setModuleFactory` + `createWasmFactory`：

```js
import { setModuleFactory, createWasmFactory } from "minicad-web";

// WASM 文件托管在 https://example.com/static/wasm/
setModuleFactory(createWasmFactory("https://example.com/static/wasm/"));
```

请在 `<minicad-editor>` 元素挂载到 DOM **之前**调用。

---

### 方式三 — Vite 项目（动态 import）

```js
import { setModuleFactory } from "minicad-web";

setModuleFactory(() => import("/wasm/minicad.js").then((m) => m.default()));
```

---

### 方式四 — 无 UI 的 Headless 模式

直接使用 `MiniCADApi`，接入自定义渲染管线：

```js
import { loadMiniCADModule, MiniCADApi, createWasmFactory } from "minicad-web";

const module = await loadMiniCADModule(createWasmFactory("/wasm/"));
const api = new MiniCADApi(module);

api.init(canvas.width, canvas.height);

function loop() {
  api.tick();
  const lines = api.getWorldLineVerts(); // Float32Array，直接引用 WASM 堆内存，零拷贝
  // ... 使用自定义 WebGL / Canvas2D 渲染
  requestAnimationFrame(loop);
}
loop();
```

---

## MiniCADApi 接口参考

### 生命周期

| 方法           | 说明                                   |
| -------------- | -------------------------------------- |
| `init(w, h)`   | 初始化引擎，传入画布尺寸（只调用一次） |
| `resize(w, h)` | 通知引擎画布尺寸变化                   |
| `tick()`       | 推进一帧（每帧调用）                   |

### 输入

| 方法                          | 说明                                      |
| ----------------------------- | ----------------------------------------- |
| `mouseMove(x, y, btns, mods)` | 转发指针移动事件                          |
| `mouseDown(x, y, btn, mods)`  | 转发指针按下事件                          |
| `mouseUp(x, y, btn, mods)`    | 转发指针抬起事件                          |
| `wheel(delta, mods)`          | 转发滚轮事件                              |
| `keyDown(code, mods)`         | 转发按键按下（使用 `KeyboardEvent.code`） |
| `keyUp(code, mods)`           | 转发按键抬起                              |
| `runCommand(text)`            | 执行命令字符串                            |

### 顶点数据（零拷贝，直接引用 WASM 堆内存）

| 方法                   | 步长             | 说明                            |
| ---------------------- | ---------------- | ------------------------------- |
| `getScreenLineVerts()` | 7 float/顶点     | 屏幕空间线段                    |
| `getScreenTriVerts()`  | 7 float/顶点     | 屏幕空间填充三角形（UI 遮罩等） |
| `getWorldLineVerts()`  | 7 float/顶点     | 世界空间几何线段                |
| `getTextVerts()`       | 9 float/顶点     | 文字四边形（世界空间）          |
| `getScreenVP()`        | Float32Array[16] | 屏幕视图投影矩阵（行主序）      |
| `getWorldVP()`         | Float32Array[16] | 世界视图投影矩阵（行主序）      |

### 绘图工具

```js
api.startLine()      api.startRect()     api.startCircle()
api.startArc()       api.startEllipse()  api.startPolyline()
api.startSpline()    api.startText()     api.startMText()
api.startPoint()
```

### 编辑操作

```js
api.startMove()      api.startCopy()
api.startMirror()    api.startRotate()
api.deleteSelected()
api.undo()           api.redo()
```

### 约束与状态

```js
api.toggleSnap()         api.isSnapEnabled()    // → boolean
api.toggleOrtho()        api.isOrthoEnabled()   // → boolean
api.getMouseWorldX()     api.getMouseWorldY()   // 当前光标世界坐标
api.getPrompt()          // → string  当前命令提示文本
api.getLines()           // → string[]  命令行历史
```

---

## 键盘快捷键

| 按键              | 功能                  |
| ----------------- | --------------------- |
| `` ` ``（反引号） | 切换性能监视器浮层    |
| `Escape`          | 取消当前命令          |
| `Enter` / `Space` | 确认 / 重复上一条命令 |
| `Ctrl + Z`        | 撤销                  |

---

## 浏览器兼容性

| 特性            | 最低版本要求                        |
| --------------- | ----------------------------------- |
| WebGL2          | Chrome 56、Firefox 51、Safari 15    |
| Web Components  | Chrome 67、Firefox 63、Safari 10.1  |
| OffscreenCanvas | Chrome 69、Firefox 105、Safari 16.4 |

---

## 本地开发

```bash
pnpm install

# 启动开发服务器（需先将 WASM 文件放入 public/）
npm run dev

# 构建 Web 应用
npm run build

# 构建 npm 库 → 输出到 dist-lib/
npm run build:lib
```

WASM 文件（`public/minicad.js`、`public/minicad.wasm`、`public/minicad.data`）由 C++ 核心通过 Emscripten 编译生成，不纳入本仓库版本管理。请从 C++ 项目运行 `build_wasm.bat` 重新生成。

---

## 许可证

MIT
