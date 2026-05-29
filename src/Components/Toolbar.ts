import type { MiniCADApi } from '../Engine/MiniCADApi';

interface ToolButton {
  id: string;
  label: string;
  title: string;
  icon?: string;
  className?: string;
  action: () => void;
}

function appendIcon(button: HTMLButtonElement, icon?: string) {
  if (!icon) return;

  if (icon.startsWith('class:')) {
    const span = document.createElement('span');
    span.className = `tb-icon ${icon.slice(6)}`;
    button.appendChild(span);
    return;
  }

  const img = document.createElement('img');
  img.className = 'tb-icon';
  img.src = icon;
  img.alt = '';
  button.appendChild(img);
}

export class Toolbar {
  private api: MiniCADApi;
  private root: HTMLElement;
  private activeBtn: HTMLButtonElement | null = null;

  constructor(api: MiniCADApi, root: HTMLElement) {
    this.api = api;
    this.root = root;
    this.render();
  }

  render() {
    this.root.replaceChildren();

    this.root.appendChild(this.createBrand());
    this.root.appendChild(this.createGroup(this.drawTools(), true));
    this.root.appendChild(this.createSeparator());
    this.root.appendChild(this.createGroup(this.editTools(), true));
    this.root.appendChild(this.createSeparator());
    this.root.appendChild(this.createGroup(this.actionButtons(), false));
    this.root.appendChild(this.createSpacer());
    this.root.appendChild(this.createGithubLink());
  }

  clearActive() {
    if (this.activeBtn) {
      this.activeBtn.classList.remove('active');
      this.activeBtn = null;
    }
  }

  private drawTools(): ToolButton[] {
    const { api } = this;
    return [
      { id: 'btn-point', label: '点', title: '点 (PT)', icon: 'class:icon-point', action: () => api.startPoint() },
      { id: 'btn-line', label: '直线', title: '直线 (L)', icon: '/icons/Line.png', action: () => api.startLine() },
      { id: 'btn-rectangle', label: '矩形', title: '矩形 (REC)', icon: '/icons/Rect.png', action: () => api.startRect() },
      { id: 'btn-circle', label: '圆', title: '圆 (C)', icon: '/icons/Circle.png', action: () => api.startCircle() },
      { id: 'btn-arc', label: '圆弧', title: '圆弧 (ARC)', icon: '/icons/Arc.png', action: () => api.startArc() },
      { id: 'btn-ellipse', label: '椭圆', title: '椭圆 (EL)', icon: '/icons/Ellipse.png', action: () => api.startEllipse() },
      { id: 'btn-polyline', label: '多段线', title: '多段线 (PL)', icon: '/icons/Pline.png', action: () => api.startPolyline() },
      { id: 'btn-spline', label: '样条', title: '样条曲线 (SP)', icon: '/icons/Spline.png', action: () => api.startSpline() },
      { id: 'btn-text', label: '文字', title: '文字 (T)', icon: '/icons/Text.png', action: () => api.startText() },
      { id: 'btn-mtext', label: '多行', title: '多行文字 (MT)', icon: '/icons/MText.png', action: () => api.startMText() },
    ];
  }

  private editTools(): ToolButton[] {
    const { api } = this;
    return [
      { id: 'btn-move', label: '移动', title: '移动 (M)', icon: '/icons/Move.png', action: () => api.startMove() },
      { id: 'btn-copy', label: '复制', title: '复制 (CO)', icon: '/icons/Copy.png', action: () => api.startCopy() },
      { id: 'btn-mirror', label: '镜像', title: '镜像 (MI)', icon: '/icons/Mirror.png', action: () => api.startMirror() },
      { id: 'btn-rotate', label: '旋转', title: '旋转 (RO)', icon: '/icons/Rotate.png', action: () => api.startRotate() },
      { id: 'btn-delete', label: '删除', title: '删除 (Del)', icon: 'class:icon-delete', className: 'danger', action: () => api.deleteSelected() },
    ];
  }

  private actionButtons(): ToolButton[] {
    const { api } = this;
    return [
      { id: 'btn-undo', label: '撤销', title: '撤销 (Ctrl+Z)', icon: '/icons/Undo.png', action: () => api.undo() },
      { id: 'btn-redo', label: '重做', title: '重做 (Ctrl+Y)', icon: '/icons/Redo.png', action: () => api.redo() },
      { id: 'btn-cancel', label: '取消', title: '取消 / Esc', icon: 'class:icon-cancel', action: () => api.keyDown('Escape', 0) },
    ];
  }

  private createGroup(buttons: ToolButton[], tracksActive: boolean) {
    const group = document.createElement('div');
    group.className = 'tb-group';

    for (const item of buttons) {
      const button = document.createElement('button');
      button.id = item.id;
      button.title = item.title;
      if (item.className) button.classList.add(item.className);
      appendIcon(button, item.icon);
      button.appendChild(document.createTextNode(item.label));
      button.addEventListener('click', () => {
        item.action();
        if (tracksActive) this.setActive(button);
      });
      group.appendChild(button);
    }

    return group;
  }

  private createBrand() {
    const brand = document.createElement('div');
    brand.className = 'brand';

    const icon = document.createElement('img');
    icon.src = '/icons/app.ico';
    icon.alt = '';

    const name = document.createElement('span');
    name.className = 'brand-name';
    name.textContent = 'MiniCAD';

    brand.append(icon, name);
    return brand;
  }

  private createGithubLink() {
    const link = document.createElement('a');
    link.className = 'tb-link';
    link.href = 'https://github.com/CHMOSE023/MiniCAD';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.title = 'GitHub';
    link.textContent = 'GitHub';
    return link;
  }

  private createSeparator() {
    const separator = document.createElement('div');
    separator.className = 'tb-sep';
    return separator;
  }

  private createSpacer() {
    const spacer = document.createElement('div');
    spacer.className = 'tb-spacer';
    return spacer;
  }

  private setActive(button: HTMLButtonElement) {
    this.activeBtn?.classList.remove('active');
    this.activeBtn = button;
    button.classList.add('active');
  }
}
