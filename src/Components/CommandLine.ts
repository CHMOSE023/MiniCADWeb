import type { MiniCADApi } from '../Engine/MiniCADApi';

export class CommandLine {
  private api: MiniCADApi;
  private root: HTMLElement;
  private promptEl: HTMLElement;
  private historyEl: HTMLElement;
  private inputEl: HTMLInputElement;
  private prevLineCount = 0;

  constructor(api: MiniCADApi, host: HTMLElement) {
    this.api = api;
    this.root = this.createRoot();
    this.historyEl = this.root.querySelector<HTMLElement>('#cmdline-history')!;
    this.promptEl = this.root.querySelector<HTMLElement>('#cmdline-prompt')!;
    this.inputEl = this.root.querySelector<HTMLInputElement>('#cmdline-input')!;
    host.appendChild(this.root);
    this.bindInput();
  }

  update() {
    const prompt = this.api.getPrompt();
    this.promptEl.textContent = prompt || '命令:';

    const lines = this.api.getLines();
    if (lines.length !== this.prevLineCount) {
      this.prevLineCount = lines.length;
      this.historyEl.replaceChildren(...lines.map((line) => this.createHistoryLine(line)));
    }

    if (this.api.consumeScrollToBottom()) {
      this.historyEl.scrollTop = this.historyEl.scrollHeight;
    }
  }

  private bindInput() {
    this.inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
      e.stopPropagation();

      if (e.key === 'Enter') {
        const text = this.inputEl.value.trim();
        if (text) {
          this.api.runCommand(text);
          this.inputEl.value = '';
        } else {
          this.api.keyDown('Enter', 0);
        }
        e.preventDefault();
      } else if (e.key === 'Escape') {
        this.api.keyDown('Escape', 0);
        this.inputEl.value = '';
        e.preventDefault();
      }
    });
  }

  private createRoot() {
    const root = document.createElement('div');
    root.id = 'cmdline-panel';

    const history = document.createElement('div');
    history.id = 'cmdline-history';

    const prompt = document.createElement('div');
    prompt.id = 'cmdline-prompt';
    prompt.textContent = '命令:';

    const input = document.createElement('input');
    input.id = 'cmdline-input';
    input.type = 'text';
    input.placeholder = '输入命令或数值';
    input.autocomplete = 'off';
    input.spellcheck = false;

    root.append(history, prompt, input);
    return root;
  }

  private createHistoryLine(text: string) {
    const line = document.createElement('div');
    line.className = 'cmdline-line';
    line.textContent = text;
    return line;
  }
}
