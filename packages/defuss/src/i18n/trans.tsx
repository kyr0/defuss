import type { Props, Ref, VNodeChild } from "../render/types.js";
import { type Replacements, i18n } from "./i18n.js";

export interface TransRef extends Ref<string, HTMLElement> {
  updateValues: (values: Replacements) => void;
}

export interface TransProps extends Props {
  key: string;
  ref?: TransRef;
  tag?: string;
  values?: Replacements;
  class?: string;
  className?: string;
  style?: string;
  // allow for arbitrary attributes
  [propName: string]: any;
}

export const Trans = ({
  key,
  values,
  tag,
  ref,
  ...attrs
}: TransProps): VNodeChild => {
  const _ref: TransRef = ref || ({} as TransRef);

  const updateContent = () => {
    const value = i18n.t(key, values);
    if (_ref.current) {
      _ref.current.textContent = value;
    }
  };

  _ref.updateValues = (newValues: Replacements) => {
    values = newValues;
    updateContent();
  };

  // Mount handler to set up subscription after element is in DOM
  const onMount = () => {
    // Subscribe to i18n changes after the element is mounted
    i18n.subscribe(updateContent);

    if (attrs.onMount) {
      // Call the provided onMount handler if it exists
      queueMicrotask(() => attrs.onMount(_ref.current));
    }
  };

  // auto-unsubscribe when component is unmounted
  const onUnmount = () => {
    // unsubscribe from language change
    i18n.unsubscribe(updateContent);

    if (attrs.onUnmount) {
      // Call the provided onUnmount handler if it exists
      queueMicrotask(() => attrs.onUnmount(_ref.current));
    }
  };

  return {
    type: tag || "span",
    attributes: {
      ref: _ref,
      ...attrs,
      onMount,
      onUnmount,
    },
    // initially render
    children: i18n.t(key, values),
  };
};

export const T = Trans;
