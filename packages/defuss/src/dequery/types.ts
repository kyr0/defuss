import type { Globals, NodeType } from "../render/index.js";

export type FormFieldValue = string | boolean;
export interface FormKeyValues {
  [keyOrPath: string]: FormFieldValue | FormFieldValue[];
}

export interface Dimensions {
  width: number;
  height: number;
  outerWidth?: number;
  outerHeight?: number;
}

export interface Position {
  top: number;
  left: number;
}

export type DOMPropValue = string | number | boolean | null;

declare global {
  interface HTMLElement {
    _dequeryEvents?: Map<string, Set<EventListener>>;
  }
}

export interface DequeryOptions<NT = DequerySyncMethodReturnType> {
  timeout?: number;
  autoStart?: boolean;
  autoStartDelay?: number;
  resultStack?: NT[];
  globals?: Partial<Globals>;
}

export type ElementCreationOptions = JSX.HTMLAttributesLowerCase &
  JSX.HTMLAttributesLowerCase & { html?: string; text?: string };

export type DequerySyncMethodReturnType =
  | Array<NodeType>
  | NodeType
  | string
  | boolean
  | null;
