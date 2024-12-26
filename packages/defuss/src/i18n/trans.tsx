import type { Props, VNodeChild } from "@/render/types.js";
import { type Replacements, i18n } from "./i18n.js";

export interface TransProps extends Props { 
  path: string, 
  tag?: string,
  replacements?: Replacements,
  class?: string,
  className?: string,
  style?: string,
} 

export const Trans = ({ path, replacements, tag, ...attrs }: TransProps): VNodeChild => {

  const ref = {}

  // re-render component on language change
  i18n.subscribe(() => {
    const value = i18n.t(path, replacements);
    console.log('new val', value);
    //$(ref).html(value);
  });

  return {
    tag: tag || 'span',
    attributes: {
      ref,
      ...attrs,
    },
    // initially render
    children: i18n.t(path, replacements),
  }
}
