import { createRef, type Props, type Ref, type VNode } from "defuss";

/** Example usage:
 
<Placeholder as="section">
  <Icon icon="upload" className="text-2xl mr-3" />
  <span>Drop your files here</span>
</Placeholder>

 */

export interface PlaceholderProps extends Props {
  className?: string;
  ref?: Ref;
  as?: keyof HTMLElementTagNameMap; // e.g., "div", "section" (default: "div")
  children?: VNode;
  [key: string]: any;
}

/**
 * Placeholder
 * - Renders as a <div> (or any valid element) with uk-placeholder styling.
 * - Use for upload zones, drag & drop areas, and empty states.
 */
export const Placeholder = ({
  className = "",
  ref = createRef(),
  as = "div",
  children,
  ...props
}: PlaceholderProps) => {
  return {
    type: as,
    props: {
      ref,
      className: ["uk-placeholder", className].filter(Boolean).join(" "),
      ...props,
    },
    children: children,
  } as VNode;
};
