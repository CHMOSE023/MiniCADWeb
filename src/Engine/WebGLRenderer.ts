// ── Shader helpers ──────────────────────────────────────────────────────────

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error(`Shader compile error:\n${gl.getShaderInfoLog(s)}`);
  return s;
}

function linkProgram(gl: WebGL2RenderingContext, vert: string, frag: string): WebGLProgram {
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER, vert));
  gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
    throw new Error(`Program link error:\n${gl.getProgramInfoLog(prog)}`);
  return prog;
}

// Mat4 row-major (C++) → column-major Float32Array for WebGL
function rowToColMajor(src: Float32Array, dst: Float32Array) {
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      dst[c * 4 + r] = src[r * 4 + c];
}

// ── WebGLRenderer ───────────────────────────────────────────────────────────

export class WebGLRenderer {
  private gl: WebGL2RenderingContext;

  // Programs
  private lineProg!: WebGLProgram;
  private textProg!: WebGLProgram;

  // Uniform locations
  private lineVPLoc!: WebGLUniformLocation;
  private textVPLoc!: WebGLUniformLocation;
  private textTexLoc!: WebGLUniformLocation;

  // VAOs — capture vertex format once, replayed cheaply each draw
  private lineVAO!: WebGLVertexArrayObject;
  private textVAO!: WebGLVertexArrayObject;

  // Shared VBO
  private vbo!: WebGLBuffer;
  private vboCapacity = 0; // bytes currently allocated on GPU

  // Reusable column-major matrix buffer
  private colMat = new Float32Array(16);

  // GPU timer (EXT_disjoint_timer_query_webgl2, optional)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private gpuExt: any = null;
  private gpuQuery: WebGLQuery | null = null;
  private gpuQueryPending = false;
  private _lastGpuMs = -1;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this._initPrograms();
    this._initVAOs();
    // Blend is set once — persists across frames.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this.gpuExt = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  }

  // ── Initialisation ─────────────────────────────────────────────────────────

  private _initPrograms() {
    const gl = this.gl;
    const lineVert = `#version 300 es
                      in vec3 a_pos;
                      in vec4 a_color;
                      out vec4 v_color;
                      uniform mat4 u_viewProj;
                      void main() {
                          gl_Position = vec4(a_pos, 1.0) * u_viewProj;
                          v_color = a_color;
                      }`;
    const lineFrag = `#version 300 es
                      precision mediump float;
                      in vec4 v_color;
                      out vec4 fragColor;
                      void main() {
                          fragColor = v_color;
                      }`;

    this.lineProg = linkProgram(gl, lineVert, lineFrag);
    this.lineVPLoc = gl.getUniformLocation(this.lineProg, 'u_viewProj')!;
    const lineAPos   = gl.getAttribLocation(this.lineProg, 'a_pos');
    const lineAColor = gl.getAttribLocation(this.lineProg, 'a_color');

    const textVert = `#version 300 es
                      in vec3 a_pos;
                      in vec4 a_color;
                      in vec2 a_uv;
                      out vec4 v_color;
                      out vec2 v_uv;
                      uniform mat4 u_viewProj;
                      void main() {
                          gl_Position = vec4(a_pos, 1.0) * u_viewProj;
                          v_color = a_color;
                          v_uv = a_uv;
                      }`;
    const textFrag = `#version 300 es
                      precision mediump float;
                      in vec4 v_color;
                      in vec2 v_uv;
                      out vec4 fragColor;
                      uniform sampler2D u_tex;
                      void main() {
                          float alpha = texture(u_tex, v_uv).r;
                          fragColor = vec4(v_color.rgb, v_color.a * alpha);
                      }`;

    this.textProg  = linkProgram(gl, textVert, textFrag);
    this.textVPLoc  = gl.getUniformLocation(this.textProg, 'u_viewProj')!;
    this.textTexLoc = gl.getUniformLocation(this.textProg, 'u_tex')!;
    const textAPos   = gl.getAttribLocation(this.textProg, 'a_pos');
    const textAColor = gl.getAttribLocation(this.textProg, 'a_color');
    const textAUV    = gl.getAttribLocation(this.textProg, 'a_uv');

    // Store attrib indices on the instance for VAO setup
    (this as any)._lineAPos   = lineAPos;
    (this as any)._lineAColor = lineAColor;
    (this as any)._textAPos   = textAPos;
    (this as any)._textAColor = textAColor;
    (this as any)._textAUV    = textAUV;
  }

  private _initVAOs() {
    const gl   = this.gl;
    const lPos   = (this as any)._lineAPos   as number;
    const lColor = (this as any)._lineAColor as number;
    const tPos   = (this as any)._textAPos   as number;
    const tColor = (this as any)._textAColor as number;
    const tUV    = (this as any)._textAUV    as number;

    this.vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

    // Line / Triangle VAO — stride 7 floats: pos3, color4
    this.lineVAO = gl.createVertexArray()!;
    gl.bindVertexArray(this.lineVAO);
    const LS = 7 * 4;
    gl.enableVertexAttribArray(lPos);
    gl.vertexAttribPointer(lPos,   3, gl.FLOAT, false, LS, 0);
    gl.enableVertexAttribArray(lColor);
    gl.vertexAttribPointer(lColor, 4, gl.FLOAT, false, LS, 3 * 4);

    // Text VAO — stride 9 floats: pos3, color4, uv2
    this.textVAO = gl.createVertexArray()!;
    gl.bindVertexArray(this.textVAO);
    const TS = 9 * 4;
    gl.enableVertexAttribArray(tPos);
    gl.vertexAttribPointer(tPos,   3, gl.FLOAT, false, TS, 0);
    gl.enableVertexAttribArray(tColor);
    gl.vertexAttribPointer(tColor, 4, gl.FLOAT, false, TS, 3 * 4);
    gl.enableVertexAttribArray(tUV);
    gl.vertexAttribPointer(tUV,    2, gl.FLOAT, false, TS, 7 * 4);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  // ── GPU timer ──────────────────────────────────────────────────────────────

  // Call before draw calls. Polls the previous query and starts a new one.
  beginGpuFrame() {
    const { gl, gpuExt } = this;
    if (!gpuExt) return;

    if (this.gpuQueryPending && this.gpuQuery) {
      if (gl.getQueryParameter(this.gpuQuery, gl.QUERY_RESULT_AVAILABLE)) {
        if (!gl.getParameter(gpuExt.GPU_DISJOINT_EXT))
          this._lastGpuMs = gl.getQueryParameter(this.gpuQuery, gl.QUERY_RESULT) / 1e6;
        this.gpuQueryPending = false;
      }
    }

    if (!this.gpuQueryPending) {
      if (!this.gpuQuery) this.gpuQuery = gl.createQuery()!;
      gl.beginQuery(gpuExt.TIME_ELAPSED_EXT, this.gpuQuery);
    }
  }

  // Call after draw calls.
  endGpuFrame() {
    if (!this.gpuExt || this.gpuQueryPending) return;
    this.gl.endQuery(this.gpuExt.TIME_ELAPSED_EXT);
    this.gpuQueryPending = true;
  }

  // Returns last completed GPU frame time in ms, or -1 if unavailable.
  getLastGpuMs(): number { return this._lastGpuMs; }

  // ── Per-frame helpers ──────────────────────────────────────────────────────

  // Upload verts into the shared VBO, growing the GPU allocation only when needed.
  // ARRAY_BUFFER is left bound after the call (VAO will use it via its recorded pointer).
  private _uploadVerts(verts: Float32Array) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    if (verts.byteLength > this.vboCapacity) {
      this.vboCapacity = verts.byteLength * 2;
      gl.bufferData(gl.ARRAY_BUFFER, this.vboCapacity, gl.DYNAMIC_DRAW);
    }
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, verts);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  beginFrame(w: number, h: number) {
    const gl = this.gl;
    gl.viewport(0, 0, w, h);
    gl.clearColor(0.05, 0.063, 0.078, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT); // no depth buffer — context created with depth:false
  }

  // Draw line/triangle vertices. stride = 7 floats (x,y,z,r,g,b,a).
  drawLines(verts: Float32Array, vpRowMajor: Float32Array) {
    if (verts.length === 0) return;
    const gl = this.gl;
    rowToColMajor(vpRowMajor, this.colMat);
    gl.useProgram(this.lineProg);
    gl.uniformMatrix4fv(this.lineVPLoc, false, this.colMat);
    this._uploadVerts(verts);
    gl.bindVertexArray(this.lineVAO);
    gl.drawArrays(gl.LINES, 0, verts.length / 7);
    gl.bindVertexArray(null);
  }

  drawTriangles(verts: Float32Array, vpRowMajor: Float32Array) {
    if (verts.length === 0) return;
    const gl = this.gl;
    rowToColMajor(vpRowMajor, this.colMat);
    gl.useProgram(this.lineProg);
    gl.uniformMatrix4fv(this.lineVPLoc, false, this.colMat);
    this._uploadVerts(verts);
    gl.bindVertexArray(this.lineVAO);
    gl.drawArrays(gl.TRIANGLES, 0, verts.length / 7);
    gl.bindVertexArray(null);
  }

  // Draw textured quads. stride = 9 floats (x,y,z,r,g,b,a,u,v).
  drawText(verts: Float32Array, vpRowMajor: Float32Array, tex: WebGLTexture) {
    if (verts.length === 0) return;
    const gl = this.gl;
    rowToColMajor(vpRowMajor, this.colMat);
    gl.useProgram(this.textProg);
    gl.uniformMatrix4fv(this.textVPLoc, false, this.colMat);
    gl.uniform1i(this.textTexLoc, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    this._uploadVerts(verts);
    gl.bindVertexArray(this.textVAO);
    gl.drawArrays(gl.TRIANGLES, 0, verts.length / 9);
    gl.bindVertexArray(null);
  }
}
