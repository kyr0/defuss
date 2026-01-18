import loader from "@monaco-editor/loader";

const monaco = await loader.init();

export type Langauge = "javascript";

export interface CodeEditorConfig {
  language: string;
  theme: string;
  fontSize?: number;
  onReturn?: (value: any) => void;
  onChange?: (value: string) => void;
}

export interface CodeEditorData {
  language: Langauge;
  code: string;
}

export class MonacoEditor {
  public data: CodeEditorData;
  public config: CodeEditorConfig;
  public readOnly: boolean;
  public monacoEditor: any;
  public el: HTMLElement | null;

  private editorContainer: HTMLDivElement | null = null;

  constructor(
    data: CodeEditorData,
    config: CodeEditorConfig,
    readOnly: boolean,
  ) {
    this.data = data;
    this.config = config;
    this.readOnly = readOnly;
    this.el = null;
    this.monacoEditor = null;
    this.initializeMonacoEditor();
  }

  private initializeMonacoEditor() {
    this.el = document.createElement("div");
    this.el.style.width = "100%";
    this.el.style.minWidth = "0"; // IMPORTANT for flex layouts
    this.el.className = "hbox";

    const editorContainerWrapper = document.createElement("div");
    editorContainerWrapper.className = "vbox w-full";
    editorContainerWrapper.style.flex = "1";
    editorContainerWrapper.style.minWidth = "0";

    // editor container
    const editorContainer = document.createElement("div");
    editorContainer.style.width = "100%";
    editorContainer.style.minWidth = "0";
    editorContainer.style.height = "50px"; // give Monaco *some* height immediately
    editorContainerWrapper.appendChild(editorContainer);
    this.el.appendChild(editorContainerWrapper);

    // (optional) output container, unchanged
    const outputContainerWrapper = document.createElement("div");
    outputContainerWrapper.className = "mb-lg";
    outputContainerWrapper.id = `output-${Math.random().toString(36).substring(2, 9)}`;
    this.el.appendChild(outputContainerWrapper);

    this.editorContainer = editorContainer;

    // ---- the actual Monaco init must wait until the node is CONNECTED + measurable
    const tryCreate = () => {
      if (!this.editorContainer) return;

      // must be in DOM
      if (!this.editorContainer.isConnected) {
        requestAnimationFrame(tryCreate);
        return;
      }

      // must have a real width
      const { width } = this.editorContainer.getBoundingClientRect();
      if (width === 0) {
        requestAnimationFrame(tryCreate);
        return;
      }

      this.createMonacoNow();
    };

    requestAnimationFrame(tryCreate);
  }

  private createMonacoNow() {
    if (!this.editorContainer) return;

    this.monacoEditor = monaco.editor.create(this.editorContainer, {
      value: this.data.code,
      language: this.config.language || "javascript",
      automaticLayout: true,
      minimap: { enabled: false },
      readOnly: this.readOnly,
      lineNumbers: "off",
      fontSize: this.config.fontSize || 16,
      roundedSelection: true,
      hideCursorInOverviewRuler: true,
      scrollBeyondLastLine: false,
      glyphMargin: false,
      folding: false,
      lineDecorationsWidth: 0,
      lineNumbersMinChars: 0,
      wordWrap: "on",
      wrappingStrategy: "advanced",
    });

    monaco.editor.setTheme(this.config.theme || "vs-dark");

    let ignoreEvent = false;
    const updateHeight = () => {
      if (ignoreEvent || !this.editorContainer) return;

      const contentHeight = Math.min(500, this.monacoEditor.getContentHeight());
      this.editorContainer.style.height = `${Math.max(50, contentHeight)}px`;

      const rect = this.editorContainer.getBoundingClientRect();
      if (rect.width === 0) return;

      try {
        ignoreEvent = true;
        this.monacoEditor.layout({
          width: rect.width,
          height: Math.max(50, contentHeight),
        });
      } finally {
        ignoreEvent = false;
      }
    };

    this.monacoEditor.onDidContentSizeChange(updateHeight);

    // IMPORTANT: first layout after paint
    requestAnimationFrame(() => {
      updateHeight();
    });

    this.monacoEditor.onDidChangeModelContent(() => {
      this.data.code = this.monacoEditor.getValue();
      this.config.onChange?.(this.data.code);
      updateHeight();
    });
  }

  executeCode(code: string) {
    const run = new Function(`return (async() => {${code}})()`);
    const result = run();
    this.config.onReturn?.(result);
  }

  public layout() {
    if (!this.monacoEditor || !this.editorContainer) return;
    const rect = this.editorContainer.getBoundingClientRect();
    if (rect.width === 0) return;
    this.monacoEditor.layout({ width: rect.width, height: rect.height || 50 });
  }

  public getValue() {
    return this.monacoEditor?.getValue?.() ?? "";
  }

  public getDomNode() {
    return this.el;
  }

  public setValue(data: CodeEditorData) {
    this.data = data;
    this.monacoEditor?.setValue?.(data.code);
  }

  public dispose() {
    this.monacoEditor?.dispose?.();
  }
}
