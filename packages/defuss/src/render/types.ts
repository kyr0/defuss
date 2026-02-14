import type { PersistenceProviderType } from "../webstorage/index.js";
import type { CallChainImpl, Dequery } from "../dequery/dequery.js";
import type { Store } from "../store/store.js";
import type * as CSS from "csstype";

// global DOM metadata support (after all, we can monkey-patch DOM nodes, but need to be careful with spec'ed fields)
declare global {
  var __defuss_document: Document;
  var __defuss_window: Window;

  interface HTMLElement {
    _defussRef?: Ref<Element>;
  }
}

export type Globals = Performance & Window & typeof globalThis;

// --- Types & Helpers ---

export type Maybe<T> = T | null | undefined;
export type OneOrMany<T> = T | readonly T[];

export type NodeType =
  | Node
  | Text
  | Element
  | Document
  | DocumentFragment
  | HTMLElement
  | SVGElement
  | null;

export type DOMElement = Element | SVGElement;

export type SyncRenderInput = RenderInput;

export type ParentElementInput =
  | Element
  | Document
  | Dequery<NodeType>
  | undefined;

export type SyncRenderResult =
  | Array<Element | Text | undefined>
  | Element
  | Text
  | undefined;

export type ParentElementInputAsync =
  | ParentElementInput
  | Dequery<NodeType>
  | Promise<ParentElementInput | Dequery<NodeType>>;


// TODO: unused right now - remove?
export type JsxRuntimeHookFn = (
  type: VNodeType | Function | any,
  attributes:
    | (JSX.HTMLAttributes & JSX.SVGAttributes & Record<string, any>)
    | null,
  key?: string,
  sourceInfo?: JsxSourceInfo,
) => void;

export interface CSSProperties extends CSS.Properties<string | number> {
  /**
   * The index signature was removed to enable closed typing for style
   * using CSSType. You're able to use type assertion or module augmentation
   * to add properties or an index signature of your own.
   *
   * For examples and more information, visit:
   * https://github.com/frenic/csstype#what-should-i-do-when-i-get-type-errors
   */
}
export interface FontFaceProperties {
  MozFontFeatureSettings?: CSS.Property.FontFeatureSettings;
  fontDisplay?:
  | "auto"
  | "block"
  | "fallback"
  | "optional"
  | "swap"
  | (string & {});
  fontFamily?: CSS.Property.FontFamily;
  fontFeatureSettings?: CSS.Property.FontFeatureSettings;
  fontStretch?: CSS.Property.FontStretch;
  fontStyle?: CSS.Property.FontStyle;
  fontVariant?: CSS.Property.FontVariant;
  fontVariationSettings?: CSS.Property.FontVariationSettings;
  fontWeight?: CSS.Property.FontWeight;
  src?: string;
  unicodeRange?: string;
}

// TODO: unused right now - remove?
type Percent = `${number}%`; // allows "0%", "12.5%", "100%", etc.
export interface KeyFrameProperties {
  from?: Partial<CSSProperties>;
  to?: Partial<CSSProperties>;
  [k: Percent]: Partial<CSSProperties> | undefined;
}

export type MountHandler<T extends DOMElement = DOMElement> = (element: T) => void;
export type UnmountHandler<T extends DOMElement = DOMElement> = (element: T) => void;

// local helper for RefUpdateRenderFn
export type RefUpdateRenderFnInput =
  | string
  | RenderInput
  | NodeType
  | Dequery<NodeType>;
export type RefUpdateFn<ST> = (state: ST) => void;

// only locally used in ref.ts
export type RefUpdateRenderFn = (
  input: RefUpdateRenderFnInput,
) => Promise<CallChainImpl<NodeType>>;

export interface Ref<NT = null | Node | Element | Text, ST = any> {
  orphan?: boolean;
  current: NT;
  store?: Store<ST>;
  state?: ST;
  /** @deprecated use render() instead */
  update: RefUpdateRenderFn;
  render: RefUpdateRenderFn;
  updateState: RefUpdateFn<ST>;
  subscribe: (
    refUpdateFn: RefUpdateFn<ST>,
  ) => /* unsubscribe function */ () => void;
  persist: (key: string, provider?: PersistenceProviderType) => void;
  restore: (key: string, provider?: PersistenceProviderType) => void;
}

//export type VRef = (el: Element) => void

export type DefussKey = string | number;

export interface VAttributes<T extends DOMElement = DOMElement, ST = any> {
  // typing; detect ref
  ref?: Ref<T, ST>;

  // array-local unique key to identify element items in a NodeList
  key?: DefussKey;

  // defuss custom element lifecycle events
  onMount?: MountHandler<T>;
  onUnmount?: UnmountHandler<T>;
}

export interface VNodeAttributes extends VAttributes {
  [attributeName: string]: any;
  key?: DefussKey;
}

export interface JsxSourceInfo {
  fileName: string;
  lineNumber: number;
  columnNumber: number;
  exportName?: string;
  allChildrenAreStatic?: boolean;
  selfReference?: boolean;
}
export interface VNode<A = VNodeAttributes> {
  type?: VNodeType;
  attributes?: A;
  children?: VNodeChildren;
  sourceInfo?: JsxSourceInfo;
}

// string as in "div" creates an HTMLElement in the renderer
// function as in functional component is called to return a VDOM object
export type VNodeType = string | Function | any;
export type VNodeKey = string | number | any;
export type VNodeRefObject<T> = { current?: T | null };
export type VNodeRefCallback<T> = (instance: T | null) => void;
export type VNodeRef<T> = VNodeRefObject<T> | VNodeRefCallback<T>;
export type VNodeChild =
  | VNode<any>
  | object
  | string
  | number
  | boolean
  | null
  | undefined;
export type VNodeChildren = VNodeChild[];

// simple types for declaring children and props
export type Children = VNodeChildren;

export interface DomAbstractionImpl {
  hasElNamespace(domElement: Element): boolean;

  hasSvgNamespace(parentElement: Element, type: string): boolean;

  createElementOrElements(
    virtualNode: RenderInput,
    parentDomElement?: Element | Document,
  ): Array<Element | Text | undefined> | Element | Text | undefined;

  createElement(
    virtualNode: RenderInput,
    parentDomElement?: Element | Document,
  ): Element | undefined;

  createTextNode(text: string, parentDomElement?: Element | Document): Text;

  createChildElements(
    virtualChildren: VNodeChildren,
    parentDomElement?: Element,
  ): Array<Element | Text | undefined>;

  setAttribute(
    name: string,
    value: any,
    parentDomElement: Element,
    attributes: VNodeAttributes,
  ): void;

  setAttributes(
    attributes: VNode<VNodeAttributes>,
    parentDomElement: Element,
  ): void;
}

// global JSX type support
declare global {
  namespace JSX {
    interface ElementAttributesProperty {
      attrs: {};
    }

    export interface SVGAttributes<T extends DOMElement = DOMElement> extends HTMLAttributes<T> {
      accentHeight?: number | string;
      accumulate?: "none" | "sum";
      additive?: "replace" | "sum";
      alignmentBaseline?:
      | "auto"
      | "baseline"
      | "before-edge"
      | "text-before-edge"
      | "middle"
      | "central"
      | "after-edge"
      | "text-after-edge"
      | "ideographic"
      | "alphabetic"
      | "hanging"
      | "mathematical"
      | "inherit";
      allowReorder?: "no" | "yes";
      alphabetic?: number | string;
      amplitude?: number | string;
      arabicForm?: "initial" | "medial" | "terminal" | "isolated";
      ascent?: number | string;
      attributeName?: string;
      attributeType?: string;
      autoReverse?: number | string;
      azimuth?: number | string;
      baseFrequency?: number | string;
      baselineShift?: number | string;
      baseProfile?: number | string;
      bbox?: number | string;
      begin?: number | string;
      bias?: number | string;
      by?: number | string;
      calcMode?: number | string;
      capHeight?: number | string;
      clip?: number | string;
      clipPath?: string;
      clipPathUnits?: number | string;
      clipRule?: number | string;
      colorInterpolation?: number | string;
      colorInterpolationFilters?: "auto" | "sRGB" | "linearRGB" | "inherit";
      colorProfile?: number | string;
      colorRendering?: number | string;
      contentScriptType?: number | string;
      contentStyleType?: number | string;
      cursor?: number | string;
      cx?: number | string;
      cy?: number | string;
      d?: string;
      decelerate?: number | string;
      descent?: number | string;
      diffuseConstant?: number | string;
      direction?: number | string;
      display?: number | string;
      divisor?: number | string;
      dominantBaseline?: number | string;
      dur?: number | string;
      dx?: number | string;
      dy?: number | string;
      edgeMode?: number | string;
      elevation?: number | string;
      enableBackground?: number | string;
      end?: number | string;
      exponent?: number | string;
      externalResourcesRequired?: number | string;
      fill?: string;
      fillOpacity?: number | string;
      fillRule?: "nonzero" | "evenodd" | "inherit";
      filter?: string;
      filterRes?: number | string;
      filterUnits?: number | string;
      floodColor?: number | string;
      floodOpacity?: number | string;
      focusable?: number | string;
      fontFamily?: string;
      fontSize?: number | string;
      fontSizeAdjust?: number | string;
      fontStretch?: number | string;
      fontStyle?: number | string;
      fontVariant?: number | string;
      fontWeight?: number | string;
      format?: number | string;
      from?: number | string;
      fx?: number | string;
      fy?: number | string;
      g1?: number | string;
      g2?: number | string;
      glyphName?: number | string;
      glyphOrientationHorizontal?: number | string;
      glyphOrientationVertical?: number | string;
      glyphRef?: number | string;
      gradientTransform?: string;
      gradientUnits?: string;
      hanging?: number | string;
      horizAdvX?: number | string;
      horizOriginX?: number | string;
      ideographic?: number | string;
      imageRendering?: number | string;
      in2?: number | string;
      in?: string;
      intercept?: number | string;
      k1?: number | string;
      k2?: number | string;
      k3?: number | string;
      k4?: number | string;
      k?: number | string;
      kernelMatrix?: number | string;
      kernelUnitLength?: number | string;
      kerning?: number | string;
      keyPoints?: number | string;
      keySplines?: number | string;
      keyTimes?: number | string;
      lengthAdjust?: number | string;
      letterSpacing?: number | string;
      lightingColor?: number | string;
      limitingConeAngle?: number | string;
      local?: number | string;
      markerEnd?: string;
      markerHeight?: number | string;
      markerMid?: string;
      markerStart?: string;
      markerUnits?: number | string;
      markerWidth?: number | string;
      mask?: string;
      maskContentUnits?: number | string;
      maskUnits?: number | string;
      mathematical?: number | string;
      mode?: number | string;
      numOctaves?: number | string;
      offset?: number | string;
      opacity?: number | string;
      operator?: number | string;
      order?: number | string;
      orient?: number | string;
      orientation?: number | string;
      origin?: number | string;
      overflow?: number | string;
      overlinePosition?: number | string;
      overlineThickness?: number | string;
      paintOrder?: number | string;
      panose1?: number | string;
      pathLength?: number | string;
      patternContentUnits?: string;
      patternTransform?: number | string;
      patternUnits?: string;
      pointerEvents?: number | string;
      points?: string;
      pointsAtX?: number | string;
      pointsAtY?: number | string;
      pointsAtZ?: number | string;
      preserveAlpha?: number | string;
      preserveAspectRatio?: string;
      primitiveUnits?: number | string;
      r?: number | string;
      radius?: number | string;
      refX?: number | string;
      refY?: number | string;
      renderingIntent?: number | string;
      repeatCount?: number | string;
      repeatDur?: number | string;
      requiredExtensions?: number | string;
      requiredFeatures?: number | string;
      restart?: number | string;
      result?: string;
      rotate?: number | string;
      rx?: number | string;
      ry?: number | string;
      scale?: number | string;
      seed?: number | string;
      shapeRendering?: number | string;
      slope?: number | string;
      spacing?: number | string;
      specularConstant?: number | string;
      specularExponent?: number | string;
      speed?: number | string;
      spreadMethod?: string;
      startOffset?: number | string;
      stdDeviation?: number | string;
      stemh?: number | string;
      stemv?: number | string;
      stitchTiles?: number | string;
      stopColor?: string;
      stopOpacity?: number | string;
      strikethroughPosition?: number | string;
      strikethroughThickness?: number | string;
      string?: number | string;
      stroke?: string;
      strokeDasharray?: string | number;
      strokeDashoffset?: string | number;
      strokeLinecap?: "butt" | "round" | "square" | "inherit";
      strokeLinejoin?: "miter" | "round" | "bevel" | "inherit";
      strokeMiterlimit?: string;
      strokeOpacity?: number | string;
      strokeWidth?: number | string;
      surfaceScale?: number | string;
      systemLanguage?: number | string;
      tableValues?: number | string;
      targetX?: number | string;
      targetY?: number | string;
      textAnchor?: string;
      textDecoration?: number | string;
      textLength?: number | string;
      textRendering?: number | string;
      to?: number | string;
      transform?: string;
      u1?: number | string;
      u2?: number | string;
      underlinePosition?: number | string;
      underlineThickness?: number | string;
      unicode?: number | string;
      unicodeBidi?: number | string;
      unicodeRange?: number | string;
      unitsPerEm?: number | string;
      vAlphabetic?: number | string;
      values?: string;
      vectorEffect?: number | string;
      version?: string;
      vertAdvY?: number | string;
      vertOriginX?: number | string;
      vertOriginY?: number | string;
      vHanging?: number | string;
      vIdeographic?: number | string;
      viewBox?: string;
      viewTarget?: number | string;
      visibility?: number | string;
      vMathematical?: number | string;
      widths?: number | string;
      wordSpacing?: number | string;
      writingMode?: number | string;
      x1?: number | string;
      x2?: number | string;
      x?: number | string;
      xChannelSelector?: string;
      xHeight?: number | string;
      xlinkActuate?: string;
      xlinkArcrole?: string;
      xlinkHref?: string;
      xlinkRole?: string;
      xlinkShow?: string;
      xlinkTitle?: string;
      xlinkType?: string;
      xmlBase?: string;
      xmlLang?: string;
      xmlns?: string;
      xmlnsXlink?: string;
      xmlSpace?: string;
      y1?: number | string;
      y2?: number | string;
      y?: number | string;
      yChannelSelector?: string;
      z?: number | string;
      zoomAndPan?: string;
    }

    export interface PathAttributes {
      d: string;
    }

    export type EventHandler<E extends Event> = (event: E) => void;

    export type ClipboardEventHandler = EventHandler<ClipboardEvent>;
    export type CompositionEventHandler = EventHandler<CompositionEvent>;
    export type DragEventHandler = EventHandler<DragEvent>;
    export type FocusEventHandler = EventHandler<FocusEvent>;
    export type KeyboardEventHandler = EventHandler<KeyboardEvent>;
    export type MouseEventHandler = EventHandler<MouseEvent>;
    export type TouchEventHandler = EventHandler<TouchEvent>;
    export type UIEventHandler = EventHandler<UIEvent>;
    export type WheelEventHandler = EventHandler<WheelEvent>;
    export type AnimationEventHandler = EventHandler<AnimationEvent>;
    export type TransitionEventHandler = EventHandler<TransitionEvent>;
    export type ProgressEventHandler = EventHandler<ProgressEvent>;
    export type GenericEventHandler = EventHandler<Event>;
    export type PointerEventHandler = EventHandler<PointerEvent>;

    export interface DOMAttributeEventHandlersLowerCase<T extends DOMElement = DOMElement> {
      // defuss custom elment lifecycle events
      //onmount?: MountHandler<T>;
      //onunmount?: UnmountHandler<T>;

      // Image Events
      onload?: GenericEventHandler;
      onloadcapture?: GenericEventHandler;
      onerror?: GenericEventHandler;
      onerrorcapture?: GenericEventHandler;

      // Clipboard Events
      oncopy?: ClipboardEventHandler;
      oncopycapture?: ClipboardEventHandler;
      oncut?: ClipboardEventHandler;
      oncutcapture?: ClipboardEventHandler;
      onpaste?: ClipboardEventHandler;
      onpastecapture?: ClipboardEventHandler;

      // Composition Events
      oncompositionend?: CompositionEventHandler;
      oncompositionendcapture?: CompositionEventHandler;
      oncompositionstart?: CompositionEventHandler;
      oncompositionstartcapture?: CompositionEventHandler;
      oncompositionupdate?: CompositionEventHandler;
      oncompositionupdatecapture?: CompositionEventHandler;

      // Focus Events
      onfocus?: FocusEventHandler;
      onfocuscapture?: FocusEventHandler;
      onblur?: FocusEventHandler;
      onblurcapture?: FocusEventHandler;

      // Form Events
      onchange?: GenericEventHandler;
      onchangecapture?: GenericEventHandler;
      oninput?: GenericEventHandler;
      oninputcapture?: GenericEventHandler;
      onsearch?: GenericEventHandler;
      onsearchcapture?: GenericEventHandler;
      onsubmit?: GenericEventHandler;
      onsubmitcapture?: GenericEventHandler;
      oninvalid?: GenericEventHandler;
      oninvalidcapture?: GenericEventHandler;

      // Keyboard Events
      onkeydown?: KeyboardEventHandler;
      onkeydowncapture?: KeyboardEventHandler;
      onkeypress?: KeyboardEventHandler;
      onkeypresscapture?: KeyboardEventHandler;
      onkeyup?: KeyboardEventHandler;
      onkeyupcapture?: KeyboardEventHandler;

      // Media Events
      onabort?: GenericEventHandler;
      onabortcapture?: GenericEventHandler;
      oncanplay?: GenericEventHandler;
      oncanplaycapture?: GenericEventHandler;
      oncanplaythrough?: GenericEventHandler;
      oncanplaythroughcapture?: GenericEventHandler;
      ondurationchange?: GenericEventHandler;
      ondurationchangecapture?: GenericEventHandler;
      onemptied?: GenericEventHandler;
      onemptiedcapture?: GenericEventHandler;
      onencrypted?: GenericEventHandler;
      onencryptedcapture?: GenericEventHandler;
      onended?: GenericEventHandler;
      onendedcapture?: GenericEventHandler;
      onloadeddata?: GenericEventHandler;
      onloadeddatacapture?: GenericEventHandler;
      onloadedmetadata?: GenericEventHandler;
      onloadedmetadatacapture?: GenericEventHandler;
      onloadstart?: GenericEventHandler;
      onloadstartcapture?: GenericEventHandler;
      onpause?: GenericEventHandler;
      onpausecapture?: GenericEventHandler;
      onplay?: GenericEventHandler;
      onplaycapture?: GenericEventHandler;
      onplaying?: GenericEventHandler;
      onplayingcapture?: GenericEventHandler;
      onprogress?: ProgressEventHandler;
      onprogresscapture?: ProgressEventHandler;
      onratechange?: GenericEventHandler;
      onratechangecapture?: GenericEventHandler;
      onseeked?: GenericEventHandler;
      onseekedcapture?: GenericEventHandler;
      onseeking?: GenericEventHandler;
      onseekingcapture?: GenericEventHandler;
      onstalled?: GenericEventHandler;
      onstalledcapture?: GenericEventHandler;
      onsuspend?: GenericEventHandler;
      onsuspendcapture?: GenericEventHandler;
      ontimeupdate?: GenericEventHandler;
      ontimeupdatecapture?: GenericEventHandler;
      onvolumechange?: GenericEventHandler;
      onvolumechangecapture?: GenericEventHandler;
      onwaiting?: GenericEventHandler;
      onwaitingcapture?: GenericEventHandler;

      // MouseEvents
      onclick?: MouseEventHandler;
      onclickcapture?: MouseEventHandler;
      oncontextmenu?: MouseEventHandler;
      oncontextmenucapture?: MouseEventHandler;
      ondblclick?: MouseEventHandler;
      ondblclickcapture?: MouseEventHandler;
      ondrag?: DragEventHandler;
      ondragcapture?: DragEventHandler;
      ondragend?: DragEventHandler;
      ondragendcapture?: DragEventHandler;
      ondragenter?: DragEventHandler;
      ondragentercapture?: DragEventHandler;
      ondragexit?: DragEventHandler;
      ondragexitcapture?: DragEventHandler;
      ondragleave?: DragEventHandler;
      ondragleavecapture?: DragEventHandler;
      ondragover?: DragEventHandler;
      ondragovercapture?: DragEventHandler;
      ondragstart?: DragEventHandler;
      ondragstartcapture?: DragEventHandler;
      ondrop?: DragEventHandler;
      ondropcapture?: DragEventHandler;
      onmousedown?: MouseEventHandler;
      onmousedowncapture?: MouseEventHandler;
      onmouseenter?: MouseEventHandler;
      onmouseentercapture?: MouseEventHandler;
      onmouseleave?: MouseEventHandler;
      onmouseleavecapture?: MouseEventHandler;
      onmousemove?: MouseEventHandler;
      onmousemovecapture?: MouseEventHandler;
      onmouseout?: MouseEventHandler;
      onmouseoutcapture?: MouseEventHandler;
      onmouseover?: MouseEventHandler;
      onmouseovercapture?: MouseEventHandler;
      onmouseup?: MouseEventHandler;
      onmouseupcapture?: MouseEventHandler;

      // Selection Events
      onselect?: GenericEventHandler;
      onselectcapture?: GenericEventHandler;

      // Touch Events
      ontouchcancel?: TouchEventHandler;
      ontouchcancelcapture?: TouchEventHandler;
      ontouchend?: TouchEventHandler;
      ontouchendcapture?: TouchEventHandler;
      ontouchmove?: TouchEventHandler;
      ontouchmovecapture?: TouchEventHandler;
      ontouchstart?: TouchEventHandler;
      ontouchstartcapture?: TouchEventHandler;

      // Pointer Events
      onpointerover?: PointerEventHandler;
      onpointerovercapture?: PointerEventHandler;
      onpointerenter?: PointerEventHandler;
      onpointerentercapture?: PointerEventHandler;
      onpointerdown?: PointerEventHandler;
      onpointerdowncapture?: PointerEventHandler;
      onpointermove?: PointerEventHandler;
      onpointermovecapture?: PointerEventHandler;
      onpointerup?: PointerEventHandler;
      onpointerupcapture?: PointerEventHandler;
      onpointercancel?: PointerEventHandler;
      onpointercancelcapture?: PointerEventHandler;
      onpointerout?: PointerEventHandler;
      onpointeroutcapture?: PointerEventHandler;
      onpointerleave?: PointerEventHandler;
      onpointerleavecapture?: PointerEventHandler;
      ongotpointercapture?: PointerEventHandler;
      ongotpointercapturecapture?: PointerEventHandler;
      onlostpointercapture?: PointerEventHandler;
      onlostpointercapturecapture?: PointerEventHandler;

      // UI Events
      onscroll?: UIEventHandler;
      onscrollcapture?: UIEventHandler;

      // Wheel Events
      onwheel?: WheelEventHandler;
      onwheelcapture?: WheelEventHandler;

      // Animation Events
      onanimationstart?: AnimationEventHandler;
      onanimationstartcapture?: AnimationEventHandler;
      onanimationend?: AnimationEventHandler;
      onanimationendcapture?: AnimationEventHandler;
      onanimationiteration?: AnimationEventHandler;
      onanimationiterationcapture?: AnimationEventHandler;

      // Transition Events
      ontransitionend?: TransitionEventHandler;
      ontransitionendcapture?: TransitionEventHandler;
    }

    export interface DOMAttributes<T extends DOMElement = DOMElement>
      extends VAttributes<T>,
      DOMAttributeEventHandlersLowerCase<T> {
      // defuss custom attributes
      //ref?: Ref<T, any> /*| VRef*/;

      // defuss custom element lifecycle events
      onMount?: MountHandler<T>;
      onUnmount?: UnmountHandler<T>;

      // Image Events
      onLoad?: GenericEventHandler;
      onLoadCapture?: GenericEventHandler;
      onError?: GenericEventHandler;
      onErrorCapture?: GenericEventHandler;

      // Clipboard Events
      onCopy?: ClipboardEventHandler;
      onCopyCapture?: ClipboardEventHandler;
      onCut?: ClipboardEventHandler;
      onCutCapture?: ClipboardEventHandler;
      onPaste?: ClipboardEventHandler;
      onPasteCapture?: ClipboardEventHandler;

      // Composition Events
      onCompositionEnd?: CompositionEventHandler;
      onCompositionEndCapture?: CompositionEventHandler;
      onCompositionStart?: CompositionEventHandler;
      onCompositionStartCapture?: CompositionEventHandler;
      onCompositionUpdate?: CompositionEventHandler;
      onCompositionUpdateCapture?: CompositionEventHandler;

      // Focus Events
      onFocus?: FocusEventHandler;
      onFocusCapture?: FocusEventHandler;
      onBlur?: FocusEventHandler;
      onBlurCapture?: FocusEventHandler;

      // Form Events
      onChange?: GenericEventHandler;
      onChangeCapture?: GenericEventHandler;
      onInput?: GenericEventHandler;
      onInputCapture?: GenericEventHandler;
      onSearch?: GenericEventHandler;
      onSearchCapture?: GenericEventHandler;
      onSubmit?: GenericEventHandler;
      onSubmitCapture?: GenericEventHandler;
      onInvalid?: GenericEventHandler;
      onInvalidCapture?: GenericEventHandler;

      // Keyboard Events
      onKeyDown?: KeyboardEventHandler;
      onKeyDownCapture?: KeyboardEventHandler;
      onKeyPress?: KeyboardEventHandler;
      onKeyPressCapture?: KeyboardEventHandler;
      onKeyUp?: KeyboardEventHandler;
      onKeyUpCapture?: KeyboardEventHandler;

      // Media Events
      onAbort?: GenericEventHandler;
      onAbortCapture?: GenericEventHandler;
      onCanPlay?: GenericEventHandler;
      onCanPlayCapture?: GenericEventHandler;
      onCanPlayThrough?: GenericEventHandler;
      onCanPlayThroughCapture?: GenericEventHandler;
      onDurationChange?: GenericEventHandler;
      onDurationChangeCapture?: GenericEventHandler;
      onEmptied?: GenericEventHandler;
      onEmptiedCapture?: GenericEventHandler;
      onEncrypted?: GenericEventHandler;
      onEncryptedCapture?: GenericEventHandler;
      onEnded?: GenericEventHandler;
      onEndedCapture?: GenericEventHandler;
      onLoadedData?: GenericEventHandler;
      onLoadedDataCapture?: GenericEventHandler;
      onLoadedMetadata?: GenericEventHandler;
      onLoadedMetadataCapture?: GenericEventHandler;
      onLoadStart?: GenericEventHandler;
      onLoadStartCapture?: GenericEventHandler;
      onPause?: GenericEventHandler;
      onPauseCapture?: GenericEventHandler;
      onPlay?: GenericEventHandler;
      onPlayCapture?: GenericEventHandler;
      onPlaying?: GenericEventHandler;
      onPlayingCapture?: GenericEventHandler;
      onProgress?: GenericEventHandler;
      onProgressCapture?: GenericEventHandler;
      onRateChange?: GenericEventHandler;
      onRateChangeCapture?: GenericEventHandler;
      onSeeked?: GenericEventHandler;
      onSeekedCapture?: GenericEventHandler;
      onSeeking?: GenericEventHandler;
      onSeekingCapture?: GenericEventHandler;
      onStalled?: GenericEventHandler;
      onStalledCapture?: GenericEventHandler;
      onSuspend?: GenericEventHandler;
      onSuspendCapture?: GenericEventHandler;
      onTimeUpdate?: GenericEventHandler;
      onTimeUpdateCapture?: GenericEventHandler;
      onVolumeChange?: GenericEventHandler;
      onVolumeChangeCapture?: GenericEventHandler;
      onWaiting?: GenericEventHandler;
      onWaitingCapture?: GenericEventHandler;

      // MouseEvents
      onClick?: MouseEventHandler;
      onClickCapture?: MouseEventHandler;
      onContextMenu?: MouseEventHandler;
      onContextMenuCapture?: MouseEventHandler;
      onDblClick?: MouseEventHandler;
      onDblClickCapture?: MouseEventHandler;
      onDrag?: DragEventHandler;
      onDragCapture?: DragEventHandler;
      onDragEnd?: DragEventHandler;
      onDragEndCapture?: DragEventHandler;
      onDragEnter?: DragEventHandler;
      onDragEnterCapture?: DragEventHandler;
      onDragExit?: DragEventHandler;
      onDragExitCapture?: DragEventHandler;
      onDragLeave?: DragEventHandler;
      onDragLeaveCapture?: DragEventHandler;
      onDragOver?: DragEventHandler;
      onDragOverCapture?: DragEventHandler;
      onDragStart?: DragEventHandler;
      onDragStartCapture?: DragEventHandler;
      onDrop?: DragEventHandler;
      onDropCapture?: DragEventHandler;
      onMouseDown?: MouseEventHandler;
      onMouseDownCapture?: MouseEventHandler;
      onMouseEnter?: MouseEventHandler;
      onMouseEnterCapture?: MouseEventHandler;
      onMouseLeave?: MouseEventHandler;
      onMouseLeaveCapture?: MouseEventHandler;
      onMouseMove?: MouseEventHandler;
      onMouseMoveCapture?: MouseEventHandler;
      onMouseOut?: MouseEventHandler;
      onMouseOutCapture?: MouseEventHandler;
      onMouseOver?: MouseEventHandler;
      onMouseOverCapture?: MouseEventHandler;
      onMouseUp?: MouseEventHandler;
      onMouseUpCapture?: MouseEventHandler;

      // Selection Events
      onSelect?: GenericEventHandler;
      onSelectCapture?: GenericEventHandler;

      // Touch Events
      onTouchCancel?: TouchEventHandler;
      onTouchCancelCapture?: TouchEventHandler;
      onTouchEnd?: TouchEventHandler;
      onTouchEndCapture?: TouchEventHandler;
      onTouchMove?: TouchEventHandler;
      onTouchMoveCapture?: TouchEventHandler;
      onTouchStart?: TouchEventHandler;
      onTouchStartCapture?: TouchEventHandler;

      // Pointer Events
      onPointerOver?: PointerEventHandler;
      onPointerOverCapture?: PointerEventHandler;
      onPointerEnter?: PointerEventHandler;
      onPointerEnterCapture?: PointerEventHandler;
      onPointerDown?: PointerEventHandler;
      onPointerDownCapture?: PointerEventHandler;
      onPointerMove?: PointerEventHandler;
      onPointerMoveCapture?: PointerEventHandler;
      onPointerUp?: PointerEventHandler;
      onPointerUpCapture?: PointerEventHandler;
      onPointerCancel?: PointerEventHandler;
      onPointerCancelCapture?: PointerEventHandler;
      onPointerOut?: PointerEventHandler;
      onPointerOutCapture?: PointerEventHandler;
      onPointerLeave?: PointerEventHandler;
      onPointerLeaveCapture?: PointerEventHandler;
      onGotPointerCapture?: PointerEventHandler;
      onGotPointerCaptureCapture?: PointerEventHandler;
      onLostPointerCapture?: PointerEventHandler;
      onLostPointerCaptureCapture?: PointerEventHandler;

      // UI Events
      onScroll?: UIEventHandler;
      onScrollCapture?: UIEventHandler;

      // Wheel Events
      onWheel?: WheelEventHandler;
      onWheelCapture?: WheelEventHandler;

      // Animation Events
      onAnimationStart?: AnimationEventHandler;
      onAnimationStartCapture?: AnimationEventHandler;
      onAnimationEnd?: AnimationEventHandler;
      onAnimationEndCapture?: AnimationEventHandler;
      onAnimationIteration?: AnimationEventHandler;
      onAnimationIterationCapture?: AnimationEventHandler;

      // Transition Events
      onTransitionEnd?: TransitionEventHandler;
      onTransitionEndCapture?: TransitionEventHandler;
    }

    export interface HTMLAttributesLowerCase<T extends DOMElement = DOMElement> extends VAttributes<T> {

      dangerouslysetinnerhtml?: {
        __html: string;
      };

      // Standard HTML Attributes
      accept?: string;
      acceptcharset?: string;
      accesskey?: string;
      action?: string;
      allowfullscreen?: boolean;
      allowtransparency?: boolean;
      alt?: string;
      async?: boolean;
      autocomplete?: string;
      autocorrect?: string;
      autofocus?: boolean | string;
      autoplay?: boolean;
      capture?: boolean;
      cellpadding?: number | string;
      cellspacing?: number | string;
      charset?: string;
      challenge?: string;
      checked?: boolean | string;
      class?: DefussClassValue;
      classname?: DefussClassValue;
      cols?: number;
      children?: DefussChildren;
      colspan?: number;
      content?: string;
      contenteditable?: boolean;
      contextmenu?: string;
      controls?: boolean;
      controlslist?: string;
      coords?: string;
      crossorigin?: string;
      data?: string;
      datetime?: string;
      default?: boolean;
      defer?: boolean;
      dir?: string;
      disabled?: boolean;
      download?: any;
      draggable?: boolean;
      enctype?: string;
      form?: string;
      formaction?: string;
      formenctype?: string;
      formmethod?: string;
      novalidate?: boolean | string;
      formnovalidate?: boolean;
      formtarget?: string;
      frameborder?: number | string;
      headers?: string;
      height?: number | string;
      hidden?: boolean;
      high?: number;
      href?: string;
      hreflang?: string;
      for?: string;
      htmlfor?: string;
      httpequiv?: string;
      icon?: string;
      id?: string;
      inputmode?: string;
      integrity?: string;
      is?: string;
      keyparams?: string;
      keytype?: string;
      kind?: string;
      label?: string;
      lang?: string;
      list?: string;
      loop?: boolean;
      low?: number;
      manifest?: string;
      marginheight?: number;
      marginwidth?: number;
      max?: number | string;
      maxlength?: number;
      media?: string;
      mediagroup?: string;
      method?: string;
      min?: number | string;
      minlength?: number;
      multiple?: boolean;
      muted?: boolean;
      name?: string;
      open?: boolean;
      optimum?: number;
      pattern?: string;
      placeholder?: string;
      playsinline?: boolean;
      poster?: string;
      preload?: string;
      radiogroup?: string;
      readonly?: boolean;
      rel?: string;
      required?: boolean | string;
      role?: string;
      rows?: number;
      rowspan?: number;
      sandbox?: string;
      scope?: string;
      scoped?: boolean;
      scrolling?: string;
      seamless?: boolean;
      selected?: boolean;
      shape?: string;
      size?: number;
      sizes?: string;
      slot?: string;
      span?: number;
      spellcheck?: boolean;
      src?: string;
      srcset?: string;
      srcdoc?: string;
      srclang?: string;
      start?: number;
      step?: number | string;
      style?: string | Partial<CSSProperties>;
      summary?: string;
      tabindex?: number | string;
      target?: string;
      title?: string;
      type?: string;
      usemap?: string;
      value?: string | string[] | number;
      width?: number | string;
      wmode?: string;
      wrap?: string;

      // RDFa Attributes
      about?: string;
      datatype?: string;
      inlist?: any;
      prefix?: string;
      property?: string;
      resource?: string;
      typeof?: string;
      vocab?: string;

      // Microdata Attributes
      itemprop?: string;
      itemscope?: boolean;
      itemtype?: string;
      itemid?: string;
      itemref?: string;
    }

    export interface HTMLAttributes<T extends DOMElement = DOMElement> extends HTMLAttributesLowerCase<T>, DOMAttributes<T> {

      dangerouslySetInnerHTML?: {
        __html: string;
      };

      onMount?: MountHandler<T>;
      onUnmount?: UnmountHandler<T>;

      // Standard HTML Attributes
      accept?: string;
      acceptCharset?: string;
      accessKey?: string;
      action?: string;
      allowFullScreen?: boolean;
      allowTransparency?: boolean;
      alt?: string;
      async?: boolean;
      autoComplete?: string;
      autoCorrect?: string;
      autofocus?: boolean | string;
      autoFocus?: boolean;
      autoPlay?: boolean;
      capture?: boolean;
      cellPadding?: number | string;
      cellSpacing?: number | string;
      charSet?: string;
      challenge?: string;
      checked?: boolean | string;
      class?: DefussClassValue;
      className?: DefussClassValue;
      cols?: number;
      children?: DefussChildren;
      colSpan?: number;
      content?: string;
      contentEditable?: boolean;
      contextMenu?: string;
      controls?: boolean;
      controlsList?: string;
      coords?: string;
      crossOrigin?: string;
      data?: string;
      dateTime?: string;
      default?: boolean;
      defer?: boolean;
      dir?: string;
      disabled?: boolean;
      download?: any;
      draggable?: boolean;
      encType?: string;
      form?: string;
      formAction?: string;
      formEncType?: string;
      formMethod?: string;
      formNoValidate?: boolean;
      formTarget?: string;
      frameBorder?: number | string;
      headers?: string;
      height?: number | string;
      hidden?: boolean;
      high?: number;
      href?: string;
      hrefLang?: string;
      for?: string;
      htmlFor?: string;
      httpEquiv?: string;
      icon?: string;
      id?: string;
      inputMode?: string;
      integrity?: string;
      is?: string;
      keyParams?: string;
      keyType?: string;
      kind?: string;
      label?: string;
      lang?: string;
      list?: string;
      loop?: boolean;
      low?: number;
      manifest?: string;
      marginHeight?: number;
      marginWidth?: number;
      max?: number | string;
      maxLength?: number;
      media?: string;
      mediaGroup?: string;
      method?: string;
      min?: number | string;
      minLength?: number;
      multiple?: boolean;
      muted?: boolean;
      name?: string;
      open?: boolean;
      optimum?: number;
      pattern?: string;
      placeholder?: string;
      playsInline?: boolean;
      poster?: string;
      preload?: string;
      radioGroup?: string;
      readOnly?: boolean;
      rel?: string;
      required?: boolean | string;
      role?: string;
      rows?: number;
      rowSpan?: number;
      sandbox?: string;
      scope?: string;
      scoped?: boolean;
      scrolling?: string;
      seamless?: boolean;
      selected?: boolean;
      shape?: string;
      size?: number;
      sizes?: string;
      slot?: string;
      span?: number;
      spellcheck?: boolean;
      src?: string;
      srcDoc?: string;
      srcLang?: string;
      srcSet?: string;
      start?: number;
      step?: number | string;
      style?: string | Partial<CSSProperties>;
      summary?: string;
      tabIndex?: number | string;
      target?: string;
      title?: string;
      type?: string;
      useMap?: string;
      value?: string | string[] | number;
      width?: number | string;
      wmode?: string;
      wrap?: string;

      // RDFa Attributes
      about?: string;
      datatype?: string;
      inlist?: any;
      prefix?: string;
      property?: string;
      resource?: string;
      typeof?: string;
      vocab?: string;

      // Microdata Attributes
      itemProp?: string;
      itemScope?: boolean;
      itemType?: string;
      itemID?: string;
      itemRef?: string;
    }

    export interface IVirtualIntrinsicElements {
      // some-custom-element-name: HTMLAttributes;
    }

    export type HtmlIntrinsic = {
      [K in keyof HTMLElementTagNameMap]:
      HTMLAttributes<HTMLElementTagNameMap[K]>;
    };

    export type SvgIntrinsic = {
      [K in keyof SVGElementTagNameMap]:
      SVGAttributes<SVGElementTagNameMap[K]>;
    };

    // Drop SVG keys that collide with HTML keys (e.g. "a")
    export type SvgOnly = Omit<SvgIntrinsic, keyof HtmlIntrinsic>;

    export interface IntrinsicElements
      extends HtmlIntrinsic,
      SvgOnly,
      IVirtualIntrinsicElements {
      fragment: {};
    }

    // JSX.Element -> AST VNode
    export type Element = VNode | Promise<VNode | null> | null;
  }
}

export type RenderNodeInput = VNode | string | undefined;
export type RenderResultNode = Element | Text | undefined;

/**
 * DefussChild represents any valid child element in defuss.
 */
export type DefussChild =
  | VNode
  | VNodeChild
  | string
  | number
  | boolean
  | null
  | undefined
  | JSX.Element
  | DefussChild[];

/**
 * AsyncChild extends DefussChild to also accept async components (Promise-returning).
 * Use this for children of the <Async> wrapper component.
 */
export type AsyncDefussChild = Promise<DefussChild> | DefussChild;

export type DefussChildren = DefussChild; // recursive already covers arrays

export type RenderInput = DefussChild; // unify: renderer accepts the same thing

export type DefussClassValue = string | false | DefussClassValue[];

/**
 * The Props interface is the natural first argument of a functional component.
 * Usually, you will want to pass down `children`.
 */
export interface Props<NT extends DOMElement = DOMElement, ST = any> {
  children?: DefussChildren;

  /** if implemented, maps 1:1 to the id attribute of the root element returned by the functional component */
  id?: string;

  /** forward a ref from a parent component down to this component; if implemented, will become the ref of the root element, the functional component returns */
  forwardRef?: Ref<NT, ST>;

  // if implemented, maps 1:1 to key attribute of the root element returned by the functional component -- dropped before DOM rendering
  key?: DefussKey;

  /** if implemented, maps 1:1 to class attribute of the root element returned by the functional component */
  className?: DefussClassValue;

  /** if implemented, maps 1:1 to the style attribute of the root element returned by the functional component */
  style?: CSSProperties | string;

  // optional callback handler for errors (can be called inside returned by the component, to pass errors up to the parent)
  onError?: JSX.GenericEventHandler;
}

// IMPORTANT: Used extensively for all functional components that return DOMElement with {...props} props mixin (higher-order wrapped DOM elements)
export type ElementProps<T extends DOMElement> =
  Props<T> & JSX.HTMLAttributes<T>;

export type RenderResult<T = RenderInput> = T extends Array<RenderNodeInput>
  ? Array<RenderResultNode>
  : RenderResultNode;

export type AllHTMLElements = HTMLElementTagNameMap[keyof HTMLElementTagNameMap] | SVGElementTagNameMap[keyof SVGElementTagNameMap];

/**
 * Functional Component type that accepts a generic Props type.
 * Defaults to the base Props interface if no generic is provided.
 * Supports both synchronous and asynchronous rendering.
 * 
 * @example
 * 
 * export interface MyComponentProps extends Props {
 *    name: string;
 *    age: number;
 * }
 * 
 * // With custom props
 * export const MyComponent: FC<MyComponentProps> = (props) => { ... }
 * 
 * // With default Props
 * export const SimpleComponent: FC = (props) => { ... }
 * 
 * // Async component
 * export const AsyncComponent: FC = async (props) => { ... }
 */
export type FC<P = Props> = (props: P) => JSX.Element | null;
export type AsyncFC<P = Props> = (props: P) => Promise<VNode | null>;

/**
 * Alias for FunctionComponent
 */
export type FunctionComponent<P = Props> = FC<P>;
export type AsyncFunctionComponent<P = Props> = AsyncFC<P>;