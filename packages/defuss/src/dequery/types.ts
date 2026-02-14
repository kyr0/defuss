import type { Globals, NodeType } from "../render/index.js";

export type FormFieldValue = string | boolean;
export interface FormKeyValues {
  [keyOrPath: string]: FormFieldValue | FormFieldValue[];
}

export type AnyEventHandler = (ev: Event) => any;

export type TargetOf<NT> = Extract<NT, EventTarget>;

export type UnionToIntersection<U> =
  (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

export type EventMapFor<T> =
  T extends Window ? WindowEventMap :
  T extends Document ? DocumentEventMap :
  T extends SVGElement ? SVGElementEventMap :
  T extends HTMLElement ? HTMLElementEventMap :
  T extends Element ? ElementEventMap :
  Record<string, Event>;

export type EventMapForAny<T> = UnionToIntersection<EventMapFor<T>>;

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

export type DequerySyncMethodReturnType = NodeType;

// Re-export transition types for convenience
export type { TransitionConfig } from "../render/transitions.js";
