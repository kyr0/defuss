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
    console.log("Trans updateValues called with:", newValues);
    values = newValues;
    updateContent();
  };

  // Mount handler to set up subscription after element is in DOM
  const onMount = () => {
    console.log("Trans onMount called for key:", key);
    // Subscribe to i18n changes after the element is mounted
    i18n.subscribe(updateContent);
  };

  // auto-unsubscribe when component is unmounted
  const onUnmount = () => {
    console.log("Trans onUnmount called for key:", key);
    // unsubscribe from language change
    i18n.unsubscribe(updateContent);
  };

  console.log(
    "Trans component creating for key:",
    key,
    "with initial value:",
    i18n.t(key, values),
  );

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
