import { MathfieldElement } from "mathlive";
import type { MathEditorData, MathEditorConfig } from './Math';

export default class MathField {
  public api: any;
  public data: MathEditorData;
  public config: MathEditorConfig;
  public readOnly: boolean;
  public mfe: MathfieldElement;

  constructor(data: MathEditorData, api: any, config: MathEditorConfig, readOnly: boolean) {
    this.api = api;
    this.data = data;
    this.config = config;
    this.readOnly = readOnly;
    this.mfe = this.createMathfield();
  }

  private createMathfield(): MathfieldElement {
    const mfe = new MathfieldElement();

    mfe.setValue(this.data.latex);
    mfe.classList.add(this.data.type);

    if (this.readOnly) {
      mfe.virtualKeyboardTargetOrigin = "off";
      mfe.defaultMode = "inline-math";
      mfe.readOnly = true;
      return mfe;
    }

    mfe.mathVirtualKeyboardPolicy = this.config.virtualKeyboardMode;
    mfe.defaultMode = this.config.defaultMode;
    mfe.smartMode = this.config.smartMode;
    mfe.readOnly = this.readOnly;

    mfe.addEventListener("input", (ev: Event) => {
      ev.preventDefault();
      const target = ev.target as MathfieldElement;
      this.data.latex = target.value;
      console.log(target.value);
    });

    mfe.addEventListener("move-out", (ev: Event) => {
      ev.preventDefault();
      mfe.blur();
    });

    mfe.addEventListener("focus-out", (ev: CustomEvent) => {
      ev.preventDefault();
      if (ev.detail.direction === "forward") {
        mfe.executeCommand("moveToMathfieldEnd");
      } else if (ev.detail.direction === "backward") {
        mfe.executeCommand("moveToMathfieldStart");
      }
    });

    return mfe;
  }
}