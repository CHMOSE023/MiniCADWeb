export class PerfMonitor {
  private root: HTMLElement;
  private panel!: HTMLElement;
  private fpsEl!: HTMLElement;
  private frameEl!: HTMLElement;
  private jsEl!: HTMLElement;
  private gpuEl!: HTMLElement;

  private lastTs = 0;
  private lastFlush = 0;
  private intervalSum = 0;
  private jsSum = 0;
  private count = 0;

  visible = false;

  constructor(root: HTMLElement) {
    this.root = root;
    this._build();
  }

  private _build() {
    const btn = document.createElement('button');
    btn.id = 'perf-toggle';
    btn.title = '性能监测 (`)';
    btn.textContent = 'PERF';
    btn.addEventListener('click', () => this.toggle());

    this.panel = document.createElement('div');
    this.panel.id = 'perf-panel';

    const rows: [string, string][] = [
      ['FPS',  'perf-fps'],
      ['帧',   'perf-frame'],
      ['JS',   'perf-js'],
      ['GPU',  'perf-gpu'],
    ];

    for (const [label, id] of rows) {
      const row = document.createElement('div');
      row.className = 'perf-row';

      const lbl = document.createElement('span');
      lbl.className = 'perf-label';
      lbl.textContent = label;

      const val = document.createElement('span');
      val.className = 'perf-val';
      val.id = id;
      val.textContent = '—';

      row.append(lbl, val);
      this.panel.appendChild(row);
    }

    this.fpsEl   = this.panel.querySelector('#perf-fps')!;
    this.frameEl = this.panel.querySelector('#perf-frame')!;
    this.jsEl    = this.panel.querySelector('#perf-js')!;
    this.gpuEl   = this.panel.querySelector('#perf-gpu')!;

    this.root.append(btn, this.panel);
  }

  toggle() {
    this.visible = !this.visible;
    this.root.classList.toggle('active', this.visible);
    if (this.visible) {
      this.lastTs = 0;
      this.lastFlush = 0;
      this.intervalSum = 0;
      this.jsSum = 0;
      this.count = 0;
    }
  }

  // nowMs = RAF timestamp, jsMs = frame() wall time, gpuMs = last GPU query result (-1 = unavailable)
  recordFrame(nowMs: number, jsMs: number, gpuMs: number) {
    if (!this.visible) return;

    if (this.lastTs > 0) this.intervalSum += nowMs - this.lastTs;
    this.lastTs = nowMs;
    this.jsSum += jsMs;
    this.count++;

    if (nowMs - this.lastFlush < 500 || this.count === 0) return;

    const avgInterval = this.intervalSum / this.count;
    const fps = avgInterval > 0 ? 1000 / avgInterval : 0;

    this.fpsEl.textContent   = fps.toFixed(1);
    this.frameEl.textContent = avgInterval > 0 ? `${avgInterval.toFixed(1)} ms` : '—';
    this.jsEl.textContent    = `${(this.jsSum / this.count).toFixed(2)} ms`;
    this.gpuEl.textContent   = gpuMs >= 0 ? `${gpuMs.toFixed(2)} ms` : 'n/a';

    this.intervalSum = 0;
    this.jsSum       = 0;
    this.count       = 0;
    this.lastFlush   = nowMs;
  }
}
