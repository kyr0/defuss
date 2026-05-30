import { createRef, type Props, type Ref, type VNode } from "defuss";

/**
 * Animation types and origins based on UIkit documentation
 * 
 
<Animation>
  <div>Fades in</div>
</Animation>

<Animation type="scale-up" origin="top-left" reverse>
  <img src="demo.jpg" />
</Animation>

<Animation type="slide-left" fast>
  <div>Sliding in!</div>
</Animation>

<Animation type="kenburns">
  <img src="/my.jpg" alt="Ken Burns" />
</Animation>

<Animation type="stroke" as="svg" style={{ "--uk-anmt-stroke": 46 }}>
  ...svg paths etc...
</Animation>
*/

export type AnimationType =
  | "fade"
  | "scale-up"
  | "scale-down"
  | "slide-top"
  | "slide-bottom"
  | "slide-left"
  | "slide-right"
  | "slide-top-sm"
  | "slide-bottom-sm"
  | "slide-left-sm"
  | "slide-right-sm"
  | "slide-top-md"
  | "slide-bottom-md"
  | "slide-left-md"
  | "slide-right-md"
  | "kenburns"
  | "shake"
  | "stroke";
export type OriginType =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export interface AnimationProps extends Props {
  type?: AnimationType; // animation type, default is "fade"
  reverse?: boolean; // reverses the animation
  fast?: boolean; // speeds up the animation
  origin?: OriginType; // modifies transform-origin
  className?: string;
  ref?: Ref;
  children?: VNode;
  as?: keyof HTMLElementTagNameMap; // defaults to "div"
  style?: any;
  [key: string]: any;
}

/**
 * Animation
 * - Provides declarative access to all Franken UI animation classes.
 * - Use 'reverse', 'fast', and 'origin' for modifiers.
 */
export const Animation = ({
  type = "fade",
  reverse = false,
  fast = false,
  origin,
  className = "",
  as = "div",
  ref = createRef(),
  style = {},
  children,
  ...props
}: AnimationProps) => {
  // Compose class string
  const typeClass = type ? `uk-anmt-${type}` : "";
  const reverseClass = reverse ? "uk-anmt-reverse" : "";
  const fastClass = fast ? "uk-anmt-fast" : "";
  const originClass =
    origin && origin !== "center" ? `uk-transform-origin-${origin}` : "";
  const classes = [typeClass, reverseClass, fastClass, originClass, className]
    .filter(Boolean)
    .join(" ");
  const Tag = as;

  return {
    type: as,
    props: { ref, className: classes, style, ...props },
    children: children,
  } as VNode;
};
