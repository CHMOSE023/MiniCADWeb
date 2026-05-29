// WebGL glyph atlas: renders characters onto a 2D canvas and uploads as a texture.
// The atlas is updated lazily as new codepoints are needed.

interface GlyphEntry {
  x0: number; y0: number; x1: number; y1: number; // atlas pixel rect
  u0: number; v0: number; u1: number; v1: number; // UV coords [0-1]
  advanceX: number;                                // advance in font units (height=1)
}

export class GlyphAtlas {
  private gl: WebGL2RenderingContext;
  private canvas2d: OffscreenCanvas;
  private ctx2d: OffscreenCanvasRenderingContext2D;
  private texture: WebGLTexture;

  private atlasW = 1024;
  private atlasH = 1024;
  private fontSize = 64; // px on canvas
  private paddingX = 2;
  private paddingY = 2;

  private cursorX = 0;
  private cursorY = 0;
  private rowH = 0;
  private dirty = false;

  private glyphs = new Map<number, GlyphEntry>();

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.canvas2d = new OffscreenCanvas(this.atlasW, this.atlasH);
    const ctx = this.canvas2d.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2d context for glyph atlas');
    this.ctx2d = ctx;

    this.ctx2d.font = `${this.fontSize}px sans-serif`;
    this.ctx2d.fillStyle = '#ffffff';
    this.ctx2d.textBaseline = 'alphabetic';

    const tex = gl.createTexture();
    if (!tex) throw new Error('Cannot create glyph texture');
    this.texture = tex;

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // Allocate empty red-channel texture (R8 format)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, this.atlasW, this.atlasH, 0, gl.RED, gl.UNSIGNED_BYTE, null);
    gl.bindTexture(gl.TEXTURE_2D, null);

    this.rowH = this.fontSize + this.paddingY * 2;
  }

  get texId(): number {
    // Return the WebGL texture object as an integer handle using the object's internal slot.
    // Emscripten convention: just return the texture wrapped in a slot.
    // We'll pass it via a different mechanism; here we expose the WebGLTexture.
    return 0; // unused: see getTexture()
  }

  getTexture(): WebGLTexture { return this.texture; }

  // Look up or render a glyph.
  // Returns GlyphEntry in normalised font units (height=1), or null if codepoint is blank.
  lookup(cp: number): GlyphEntry | null {
    if (this.glyphs.has(cp)) return this.glyphs.get(cp)!;

    const char = String.fromCodePoint(cp);
    if (char.trim() === '') {
      // Whitespace: measure advance but don't draw
      const metrics = this.ctx2d.measureText(char);
      const advance = metrics.width / this.fontSize;
      const entry: GlyphEntry = { x0:0, y0:0, x1:0, y1:0, u0:0, v0:0, u1:0, v1:0, advanceX: advance };
      this.glyphs.set(cp, entry);
      return entry;
    }

    const metrics = this.ctx2d.measureText(char);
    const glyphW = Math.ceil(metrics.width) + this.paddingX * 2;
    const glyphH = this.rowH;

    // Wrap row if needed
    if (this.cursorX + glyphW > this.atlasW) {
      this.cursorX = 0;
      this.cursorY += this.rowH;
    }
    if (this.cursorY + glyphH > this.atlasH) {
      // Atlas full – ideally reallocate, for now return null
      return null;
    }

    const dx = this.cursorX + this.paddingX;
    const dy = this.cursorY + this.paddingY + this.fontSize;
    this.ctx2d.clearRect(this.cursorX, this.cursorY, glyphW, glyphH);
    this.ctx2d.fillText(char, dx, dy);

    const x0 = this.cursorX;
    const y0 = this.cursorY;
    const x1 = this.cursorX + glyphW;
    const y1 = this.cursorY + glyphH;

    const ascent   = metrics.actualBoundingBoxAscent  ?? this.fontSize * 0.8;
    const descent  = metrics.actualBoundingBoxDescent ?? this.fontSize * 0.2;
    const totalH   = ascent + descent;
    const normW    = metrics.width / this.fontSize;
    const normAsc  = ascent  / this.fontSize;
    const normDesc = descent / this.fontSize;

    const entry: GlyphEntry = {
      x0, y0, x1, y1,
      u0: x0 / this.atlasW, v0: y0 / this.atlasH,
      u1: x1 / this.atlasW, v1: y1 / this.atlasH,
      advanceX: normW,
    };
    void totalH; void normAsc; void normDesc;

    this.glyphs.set(cp, entry);
    this.cursorX += glyphW;
    this.dirty = true;
    return entry;
  }

  // Upload dirty regions to GPU. Call once per frame after all lookups.
  flush() {
    if (!this.dirty) return;
    this.dirty = false;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    // Re-upload the whole atlas (simple, sufficient for typical CAD text loads)
    const imageData = this.ctx2d.getImageData(0, 0, this.atlasW, this.atlasH);
    // Extract red channel only
    const red = new Uint8Array(this.atlasW * this.atlasH);
    for (let i = 0; i < red.length; i++) red[i] = imageData.data[i * 4]; // R from RGBA
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, this.atlasW, this.atlasH, 0, gl.RED, gl.UNSIGNED_BYTE, red);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }
}
