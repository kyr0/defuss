import "./math.css";
import 'boxicons';
import MathField from "./MathField";

export interface MathEditorData {
  type: string;
  latex: string;
}

export interface MathEditorConfig {
  virtualKeyboardMode: 'manual' | 'auto';
  defaultMode: 'math' | 'text' | 'inline-math';
  smartMode: boolean;
  virtualKeyboardTheme: 'material' | 'apple';
}

export default class MathEditor {
  private api: any;
  private data: MathEditorData;
  private config: MathEditorConfig;
  private readOnly: boolean;
  private mathfield: MathField;

  static get isReadOnlySupported() {
    return true;
  }

  static get enableLineBreaks() {
    return true;
  }

  static get toolbox() {
    return {
      title: "Math Editor",
      icon: "<box-icon name='math'></box-icon>",
    };
  }

  get CSS() {
    return {
      settingsButton: this.api.styles.settingsButton,
      settingsButtonActive: this.api.styles.settingsButtonActive,
      wrapper: 'cdx-math',
      wrapperForType: (type: string) => `cdx-math-${type}`
    };
  }

  static get DEFAULT_PLACEHOLDER() {
    return 'e=mc^2';
  }

  static get DEFAULT_TYPE() {
    return 'cdx-math-dark';
  }

  constructor({ data, config, api, readOnly }: { data: MathEditorData, config: MathEditorConfig, api: any, readOnly: boolean }) {
    this.api = api;
    this.data = {
      type: data.type || MathEditor.DEFAULT_TYPE,
      latex: data.latex || MathEditor.DEFAULT_PLACEHOLDER
    };
    this.config = {
      virtualKeyboardMode: config.virtualKeyboardMode || 'manual',
      defaultMode: config.defaultMode || 'math',
      smartMode: config.smartMode || false,
      virtualKeyboardTheme: config.virtualKeyboardTheme || 'material',
    };
    this.readOnly = readOnly;
    this.mathfield = this.createMfe();
  }

  createMfe() {
    return new MathField(this.data, this.api, this.config, this.readOnly);
  }

  render() {
    return this.mathfield.mfe;
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

  static get MATH_TYPES() {
    return [
      'primary',
      'secondary',
      'info',
      'success',
      'warning',
      'danger',
      'light',
      'dark',
      'pink',
      'choco'
    ];
  }

  renderSettings() {
    const settingsContainer = this.make('div');
    MathEditor.MATH_TYPES.forEach((type) => {
      const settingsButton = this.make('div',
        [this.CSS.wrapper, this.CSS.settingsButton, this.CSS.wrapperForType(type)],
        {
          innerHTML: 'M',
        });

      if (this.data.type === type) {
        settingsButton.classList.add(this.CSS.settingsButtonActive);
      }

      settingsButton.addEventListener('click', () => {
        this.mathfield.mfe.classList.remove(this.data.type);
        this.mathfield.mfe.classList.add(this.CSS.wrapperForType(type));
        this.data.type = this.CSS.wrapperForType(type);

        settingsContainer.querySelectorAll(`.${this.CSS.settingsButton}`)
          .forEach((button) => button.classList.remove(this.CSS.settingsButtonActive));

        settingsButton.classList.add(this.CSS.settingsButtonActive);
      });

      settingsContainer.appendChild(settingsButton);
    });
    return settingsContainer;
  }

  save(blockContent: HTMLElement): MathEditorData {
    return {
      type: this.data.type,
      latex: this.mathfield.data.latex,
    };
  }

  onPaste(event: any) {
    const { data } = event.detail;
    this.data = {
      type: this.data.type,
      latex: data.innerHTML || '',
    };
  }

  static get conversionConfig() {
    return {
      export: (data: MathEditorData) => data.latex,
      import: (string: string) => {
        return {
          latex: string,
          type: this.DEFAULT_TYPE,
        };
      }
    };
  }

  static get sanitize() {
    return {
      type: false,
      latex: true,
    };
  }
}