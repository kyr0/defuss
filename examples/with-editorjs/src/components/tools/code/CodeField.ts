import loader from '@monaco-editor/loader';

const monaco = await loader.init();

export type Langauge = 'javascript'

export interface CodeEditorConfig {
  language: string;
  theme: string;
}

export interface CodeEditorData {
  langauge: Langauge;
  code: string;
}

export class CodeField {
  public api: any;
  public data: CodeEditorData;
  public config: CodeEditorConfig;
  public readOnly: boolean;
  public monacoEditor: any;
  public el: HTMLElement;

  constructor(data: CodeEditorData, api: any, config: CodeEditorConfig, readOnly: boolean) {
    this.api = api;
    this.data = data;
    this.config = config;
    this.readOnly = readOnly;
    this.initializeMonacoEditor();
  }

  private async initializeMonacoEditor() {
    this.el = document.createElement('div');
    this.el.style.width = '100%';
    this.el.className = 'hbox'

    const editorContainerWrapper = document.createElement('div');
    editorContainerWrapper.className = 'vbox w-full';

    // create a div element for the run button
    const runButtonContainer = document.createElement('div');

    const runButton = document.createElement('button');
    runButton.className = 'rounded-full run-code';
    runButton.textContent = '⛛';

    runButtonContainer.appendChild(runButton);

    // create a div element for the editor
    const editorContainer = document.createElement('div');
    editorContainer.style.width = '100%';
    editorContainer.style.minHeight = '100%';

    // append the editor and run button to the main element
    editorContainerWrapper.appendChild(editorContainer);
    editorContainerWrapper.appendChild(runButtonContainer);
    this.el.appendChild(editorContainerWrapper);

    const outputContainerWrapper = document.createElement('div');
    outputContainerWrapper.className = "mb-lg"
    outputContainerWrapper.id = `output-${Math.random().toString(36).substring(2, 9)}`;
    this.el.appendChild(outputContainerWrapper);

    this.monacoEditor = monaco.editor.create(editorContainer, {
      value: this.data.code,
      language: this.config.language || 'javascript',
      automaticLayout: true,
      minimap: {
        enabled: false
      },
      readOnly: this.readOnly,
      lineNumbers: "off",
      fontSize: 16,
      roundedSelection: true,
      hideCursorInOverviewRuler: true,
      scrollBeyondLastLine: false,
      glyphMargin: false,
      folding: false,
      lineDecorationsWidth: 0,
      lineNumbersMinChars: 0,
      wordWrap: 'on',
      wrappingStrategy: 'advanced',
    });

    monaco.editor.setTheme(this.config.theme || 'vs-dark');

    const computedStyle = editorContainer.getBoundingClientRect();
    let ignoreEvent = false;
    const updateHeight = () => {
      const contentHeight = Math.min(500, this.monacoEditor.getContentHeight());
      // editorContainer.style.width = `${width}px`;
      editorContainer.style.height = `${contentHeight}px`;

      const computedStyle = editorContainer.getBoundingClientRect();
      try {
        ignoreEvent = true;
        this.monacoEditor.layout({ width: computedStyle.width, height: Math.max(50, contentHeight) });
      } finally {
        ignoreEvent = false;
      }
    };
    this.monacoEditor.onDidContentSizeChange(updateHeight);

    this.monacoEditor.layout({ width: computedStyle.width, height: 50 });
    updateHeight();

    this.monacoEditor.onDidChangeModelContent(() => {
      this.data.code = this.monacoEditor.getValue();
      console.log(this.data);
    });


    runButton.addEventListener('click', () => {
      console.log('Running code', this.data.code);

      this.executeCode(this.data.code, outputContainerWrapper);
    });

  }

  protected executeCode(code: string, outputContainer: HTMLElement) {

    const wrapperHarnessCode = `
const reportingConsole = {};
const consoleMethods = ['log', 'warn', 'error', 'info'];
const outputEl = document.getElementById('${outputContainer.id}');

consoleMethods.forEach(method => {
  reportingConsole[method] = function(...args) {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    const preEl = document.createElement('pre');
    preEl.style.color = method === 'error' ? '#cc0000' : '#fff';
    preEl.textContent = message;
    outputEl.appendChild(preEl);
  };
});

;(function(console, outputEl) {
  try {
    const exec = () => eval(\`${code}\`)
    const preEl = document.createElement('pre');
    preEl.style.color = '#777';
    preEl.textContent = '< ' + exec();
    outputEl.appendChild(preEl);
  } catch(e) {
    console.error(e.toString());
  }
})(reportingConsole, outputEl);
`;
    const run = new Function(wrapperHarnessCode);
    run();
    /*
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';

    outputContainer.innerHTML = '';
    outputContainer.appendChild(iframe);

    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(`
      <html>
        <head>
          <style>
            body, head {
              font-family: 'Arial';
              font-size: 14px;
              background-color: #000;
              color: #fff;
              margin: 0;
              padding: 0;
            }
          </style>
          <script src="https://cdn.plot.ly/plotly-3.0.0.min.js"></script>
          <script>
          (function() {
            const originalConsole = window.console;
            const consoleMethods = ['log', 'warn', 'error', 'info'];

            consoleMethods.forEach(method => {
              console[method] = function(...args) {
                const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
                document.write(\`<pre style="color: \${method === 'error' ? '#cc0000' : '#fff'}">\${message}</pre>\`);
                //originalConsole[method].apply(originalConsole, args);
              };
            });
          })();

          window.plot = () => {

          }
          </script>
        </head>
        <body>
          <div id="plot"></div>
          <script>
            try {
              ${code}
            }
            catch (e) {
              document.write('<pre style="color: #cc0000">' + e + '</pre>');
            }
          </script>
        </body>
      </html>
    `);
    iframeDoc.close();
    */
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