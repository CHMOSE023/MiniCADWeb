import type { MiniCADApi } from '../Engine/MiniCADApi';

export class TextInputOverlay {
  private api: MiniCADApi;
  private textOverlay: HTMLElement;
  private mtextOverlay: HTMLElement;
  private textField: HTMLInputElement;
  private mtextField: HTMLTextAreaElement;

  constructor(api: MiniCADApi, host: HTMLElement) {
    this.api = api;

    const text = TextInputOverlay.buildTextPanel();
    const mtext = TextInputOverlay.buildMTextPanel();
    this.textOverlay = text.overlay;
    this.mtextOverlay = mtext.overlay;
    this.textField = text.field;
    this.mtextField = mtext.field;

    host.append(this.textOverlay, this.mtextOverlay);

    text.okBtn.addEventListener('click', () => this._submitText());
    text.cancelBtn.addEventListener('click', () => this._cancelText());
    mtext.okBtn.addEventListener('click', () => this._submitMText());
    mtext.cancelBtn.addEventListener('click', () => this._cancelMText());

    this.textField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this._submitText(); }
      if (e.key === 'Escape') { this._cancelText(); }
    });
    this.mtextField.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { this._cancelMText(); }
    });
  }

  update() {
    const { api } = this;
    const textActive = api.isTextInputActive();
    const mtextActive = api.isMTextInputActive();

    if (textActive && !this.textOverlay.classList.contains('visible')) {
      this.textOverlay.classList.add('visible');
      this.textField.value = '';
      this.textField.focus();
    } else if (!textActive) {
      this.textOverlay.classList.remove('visible');
    }

    if (mtextActive && !this.mtextOverlay.classList.contains('visible')) {
      this.mtextOverlay.classList.add('visible');
      this.mtextField.value = '';
      this.mtextField.focus();
    } else if (!mtextActive) {
      this.mtextOverlay.classList.remove('visible');
    }
  }

  private _submitText() {
    this.api.submitTextInput(this.textField.value);
    this.textOverlay.classList.remove('visible');
    this.textField.value = '';
  }

  private _cancelText() {
    this.api.keyDown('Escape', 0);
    this.textOverlay.classList.remove('visible');
    this.textField.value = '';
  }

  private _submitMText() {
    this.api.submitMTextInput(this.mtextField.value);
    this.mtextOverlay.classList.remove('visible');
    this.mtextField.value = '';
  }

  private _cancelMText() {
    this.api.keyDown('Escape', 0);
    this.mtextOverlay.classList.remove('visible');
    this.mtextField.value = '';
  }

  private static buildTextPanel() {
    const overlay = document.createElement('div');
    overlay.id = 'text-input-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const panel = document.createElement('div');
    panel.className = 'text-panel';

    const title = document.createElement('div');
    title.className = 'text-panel-title';
    title.textContent = '输入文字';

    const field = document.createElement('input');
    field.id = 'text-input-field';
    field.type = 'text';
    field.placeholder = '请输入文字内容';
    field.autocomplete = 'off';
    field.spellcheck = false;
    field.maxLength = 256;

    const heightRow = document.createElement('div');
    heightRow.className = 'text-panel-row';
    const heightLabel = document.createElement('label');
    heightLabel.htmlFor = 'text-height-field';
    heightLabel.textContent = '字高';
    const heightField = document.createElement('input');
    heightField.id = 'text-height-field';
    heightField.type = 'number';
    heightField.value = '2.5';
    heightField.min = '0.1';
    heightField.max = '1000';
    heightField.step = '0.5';
    heightRow.append(heightLabel, heightField);

    const hint = document.createElement('div');
    hint.className = 'text-panel-hint';
    hint.append(
      '按 ', buildKbd('Enter'), ' 确定，按 ', buildKbd('Esc'), ' 取消',
    );

    const actions = document.createElement('div');
    actions.className = 'text-panel-actions';
    const cancelBtn = document.createElement('button');
    cancelBtn.id = 'text-btn-cancel';
    cancelBtn.textContent = '取消';
    const okBtn = document.createElement('button');
    okBtn.id = 'text-btn-ok';
    okBtn.textContent = '确定';
    actions.append(cancelBtn, okBtn);

    panel.append(title, field, heightRow, hint, actions);
    overlay.appendChild(panel);
    return { overlay, field, okBtn, cancelBtn };
  }

  private static buildMTextPanel() {
    const overlay = document.createElement('div');
    overlay.id = 'mtext-input-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const panel = document.createElement('div');
    panel.className = 'text-panel';

    const title = document.createElement('div');
    title.className = 'text-panel-title';
    title.textContent = '输入多行文字';

    const field = document.createElement('textarea');
    field.id = 'mtext-input-field';
    field.placeholder = '请输入多行文字内容';
    field.autocomplete = 'off';
    field.spellcheck = false;

    const row = document.createElement('div');
    row.className = 'text-panel-row';

    const heightLabel = document.createElement('label');
    heightLabel.htmlFor = 'mtext-height-field';
    heightLabel.textContent = '字高';
    const heightField = document.createElement('input');
    heightField.id = 'mtext-height-field';
    heightField.type = 'number';
    heightField.value = '2.5';
    heightField.min = '0.1';
    heightField.max = '1000';
    heightField.step = '0.5';

    const widthLabel = document.createElement('label');
    widthLabel.htmlFor = 'mtext-width-field';
    widthLabel.textContent = '宽度';
    const widthField = document.createElement('input');
    widthField.id = 'mtext-width-field';
    widthField.type = 'number';
    widthField.value = '0';
    widthField.min = '0';
    widthField.max = '100000';
    widthField.step = '1';

    row.append(heightLabel, heightField, widthLabel, widthField);

    const hint = document.createElement('div');
    hint.className = 'text-panel-hint';
    hint.append(
      '宽度 0 表示不限制；按 ',
      buildKbd('Ctrl'), '+', buildKbd('Enter'),
      ' 确定，按 ', buildKbd('Esc'), ' 取消',
    );

    const actions = document.createElement('div');
    actions.className = 'text-panel-actions';
    const cancelBtn = document.createElement('button');
    cancelBtn.id = 'mtext-btn-cancel';
    cancelBtn.textContent = '取消';
    const okBtn = document.createElement('button');
    okBtn.id = 'mtext-btn-ok';
    okBtn.textContent = '确定';
    actions.append(cancelBtn, okBtn);

    panel.append(title, field, row, hint, actions);
    overlay.appendChild(panel);
    return { overlay, field, okBtn, cancelBtn };
  }
}

function buildKbd(label: string) {
  const kbd = document.createElement('kbd');
  kbd.textContent = label;
  return kbd;
}
