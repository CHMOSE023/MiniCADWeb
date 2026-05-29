import type { MiniCADApi } from '../Engine/MiniCADApi';

export class StatusBar {
  private api: MiniCADApi;
  private root: HTMLElement;
  private coordsEl: HTMLElement;
  private snapPill: HTMLElement;
  private orthoPill: HTMLElement;
  private lastSnap: boolean | null = null;
  private lastOrtho: boolean | null = null;

  constructor(api: MiniCADApi, root: HTMLElement) {
    this.api = api;
    this.root = root;
    this.render();
    this.coordsEl = this.root.querySelector<HTMLElement>('#status-coords')!;
    this.snapPill = this.root.querySelector<HTMLElement>('#pill-snap')!;
    this.orthoPill = this.root.querySelector<HTMLElement>('#pill-ortho')!;
    this.bindToggles();
    this.updateToggles();
  }

  update() {
    const wx = this.api.getMouseWorldX();
    const wy = this.api.getMouseWorldY();
    this.coordsEl.textContent = `X: ${wx.toFixed(3)}  Y: ${wy.toFixed(3)}`;
    this.updateToggles();
  }

  private render() {
    this.root.replaceChildren(
      this.createSegment(this.createPill('就绪', 'active-mode')),
      this.createSegment(this.createHint(), 'hint'),
      this.createSegment('滚轮缩放，中键平移', 'hint'),
      this.createSegment(this.createCoords()),
      this.createRightSegment(),
    );
  }

  private bindToggles() {
    this.snapPill.addEventListener('click', () => {
      this.api.toggleSnap();
      this.updateToggles();
    });
    this.orthoPill.addEventListener('click', () => {
      this.api.toggleOrtho();
      this.updateToggles();
    });
  }

  private updateToggles() {
    const snapOn = this.api.isSnapEnabled();
    if (snapOn !== this.lastSnap) {
      this.lastSnap = snapOn;
      this.snapPill.className = `pill toggleable ${snapOn ? 'snap-on' : 'snap-off'}`;
      this.snapPill.textContent = snapOn ? 'SNAP 开' : 'SNAP 关';
      this.snapPill.setAttribute('aria-checked', String(snapOn));
    }

    const orthoOn = this.api.isOrthoEnabled();
    if (orthoOn !== this.lastOrtho) {
      this.lastOrtho = orthoOn;
      this.orthoPill.className = `pill toggleable ${orthoOn ? 'ortho-on' : 'ortho-off'}`;
      this.orthoPill.textContent = orthoOn ? 'ORTHO 开' : 'ORTHO 关';
      this.orthoPill.setAttribute('aria-checked', String(orthoOn));
    }
  }

  private createSegment(content: string | Node, className = '') {
    const segment = document.createElement('span');
    segment.className = `seg ${className}`.trim();
    if (typeof content === 'string') segment.textContent = content;
    else segment.appendChild(content);
    return segment;
  }

  private createRightSegment() {
    const segment = document.createElement('span');
    segment.className = 'seg right';

    const snap = this.createPill('SNAP', 'toggleable snap-on');
    snap.id = 'pill-snap';
    snap.title = '切换捕捉 (F3)';
    snap.setAttribute('role', 'switch');
    snap.tabIndex = 0;
    snap.setAttribute('aria-checked', 'true');

    const ortho = this.createPill('ORTHO', 'toggleable ortho-off');
    ortho.id = 'pill-ortho';
    ortho.title = '切换正交 (F8)';
    ortho.setAttribute('role', 'switch');
    ortho.tabIndex = 0;
    ortho.setAttribute('aria-checked', 'false');

    segment.append(snap, ortho);
    return segment;
  }

  private createCoords() {
    const coords = document.createElement('span');
    coords.id = 'status-coords';
    coords.className = 'coords';
    coords.textContent = 'X: 0.000  Y: 0.000';
    return coords;
  }

  private createHint() {
    const hint = document.createElement('span');
    hint.append(this.createKey('L'), ' 直线 ', this.createKey('C'), ' 圆 ', this.createKey('Esc'), ' 取消');
    return hint;
  }

  private createKey(label: string) {
    const key = document.createElement('kbd');
    key.textContent = label;
    return key;
  }

  private createPill(label: string, className: string) {
    const pill = document.createElement('span');
    pill.className = `pill ${className}`;
    pill.textContent = label;
    return pill;
  }
}
