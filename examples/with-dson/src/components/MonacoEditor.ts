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

  constructor(
    data: CodeEditorData,
    config: CodeEditorConfig,
    readOnly: boolean,
  ) {
    this.data = data;
    this.config = config;
    this.readOnly = readOnly;
    this.el = null;
    this.initializeMonacoEditor();
  }

  private async initializeMonacoEditor() {
    this.el = document.createElement("div");
    this.el.style.width = "100%";
    this.el.className = "hbox";

    const editorContainerWrapper = document.createElement("div");
    editorContainerWrapper.className = "vbox w-full";

    // create a div element for the editor
    const editorContainer = document.createElement("div");
    editorContainer.style.width = "100%";
    editorContainer.style.minHeight = "100%";

    // append the editor and run button to the main element
    editorContainerWrapper.appendChild(editorContainer);
    this.el.appendChild(editorContainerWrapper);

    const outputContainerWrapper = document.createElement("div");
    outputContainerWrapper.className = "mb-lg";
    outputContainerWrapper.id = `output-${Math.random().toString(36).substring(2, 9)}`;
    this.el.appendChild(outputContainerWrapper);

    this.monacoEditor = monaco.editor.create(editorContainer, {
      value: this.data.code,
      language: this.config.language || "javascript",
      automaticLayout: true,
      minimap: {
        enabled: false,
      },
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

    const computedStyle = editorContainer.getBoundingClientRect();
    let ignoreEvent = false;
    const updateHeight = () => {
      const contentHeight = Math.min(500, this.monacoEditor.getContentHeight());
      editorContainer.style.height = `${contentHeight}px`;

      const computedStyle = editorContainer.getBoundingClientRect();
      try {
        ignoreEvent = true;
        this.monacoEditor.layout({
          width: computedStyle.width,
          height: Math.max(50, contentHeight),
        });
      } finally {
        ignoreEvent = false;
      }
    };
    this.monacoEditor.onDidContentSizeChange(updateHeight);

    this.monacoEditor.layout({ width: computedStyle.width, height: 50 });
    updateHeight();

    this.monacoEditor.onDidChangeModelContent(() => {
      this.data.code = this.monacoEditor.getValue();
      this.config.onChange?.(this.data.code);
    });
  }

  executeCode(code: string) {
    const run = new Function(`return (async() => {${code}})()`);
    const result = run();
    this.config.onReturn?.(result);
  }

  public layout() {
    this.monacoEditor.layout({});
  }

  public getValue() {
    return this.monacoEditor.getValue();
  }

  public getDomNode() {
    return this.el;
  }

  public setValue(data: CodeEditorData) {
    this.data = data;
    this.monacoEditor.setValue(data.code);
  }

  public dispose() {
    this.monacoEditor.dispose();
  }
}
