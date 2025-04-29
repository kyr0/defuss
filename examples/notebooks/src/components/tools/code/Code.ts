import './Code.css';
import { CodeField, type CodeEditorConfig, type CodeEditorData } from "./CodeField.js";

export default class CodeEditor {
  private api: any;
  private data: CodeEditorData;
  private config: CodeEditorConfig;
  private readOnly: boolean;
  private codeField: CodeField;

  static get isReadOnlySupported() {
    return true;
  }

  static get enableLineBreaks() {
    return true;
  }

  static get toolbox() {
    return {
      title: "Code Editor",
      icon: "<span>$</span>",
    };
  }

  get CSS() {
    return {
      settingsButton: this.api.styles.settingsButton,
      settingsButtonActive: this.api.styles.settingsButtonActive,
      wrapper: 'cdx-code',
      wrapperForType: (type: string) => `cdx-code-${type}`
    };
  }

  static get DEFAULT_PLACEHOLDER() {
    return 'cosole.log("Hello, World!")';
  }

  static get DEFAULT_TYPE() {
    return 'cdx-code-dark';
  }

  constructor({ data, config, api, readOnly }: { data: CodeEditorData, config: CodeEditorConfig, api: any, readOnly: boolean }) {
    this.api = api;
    this.data = data;
    this.config = {
      language: config.language || 'javascript',
      theme: config.theme || 'vs-dark',
    };
    this.readOnly = readOnly;
    this.codeField = this.createMfe();
  }

  createMfe() {
    return new CodeField(this.data, this.api, this.config, this.readOnly);
  }

  render() {
    return this.codeField.getDomNode();
  }

  make(tagName: string, classNames: string | Array<string> = null, attributes: Record<string, any> = {}) {
    const el = document.createElement(tagName);
    if (Array.isArray(classNames)) {
      el.classList.add(...classNames);
    } else if (classNames) {
      el.classList.add(classNames);
    }

    for (const attrName in attributes) {
      el[attrName] = attributes[attrName];
    }

    return el;
  }

  static get LANGUAGE_TYPES() {
    return [
      'javascript'
    ];
  }

  renderSettings() {
    const settingsContainer = this.make('div');
    CodeEditor.LANGUAGE_TYPES.forEach((type) => {
      const settingsButton = this.make('div',
        [this.CSS.wrapper, this.CSS.settingsButton, this.CSS.wrapperForType(type)],
        {
          innerHTML: 'M',
        });

      if (this.data.langauge === type) {
        settingsButton.classList.add(this.CSS.settingsButtonActive);
      }

      settingsButton.addEventListener('click', () => {
        console.log("Clicked on settings button", type);
      });

      settingsContainer.appendChild(settingsButton);
    });
    return settingsContainer;
  }

  save(blockContent: HTMLElement): CodeEditorData {
    return {
      langauge: this.data.langauge,
      code: this.codeField.getValue(),
    };
  }

  onPaste(event: any) {
    const { data } = event.detail;
    this.data = {
      langauge: this.data.langauge,
      code: data.innerHTML || '',
    };
    this.codeField.setValue(this.data);
  }

  static get conversionConfig() {
    return {
      export: (data: CodeEditorData) => data.code,
      import: (string: string) => {
        return {
          code: string,
          language: this.DEFAULT_TYPE,
        };
      }
    };
  }

  static get sanitize() {
    return {
      language: false,
      code: false,
    };
  }
}