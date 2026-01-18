import { createRef, type Props, type Ref, type VNode } from "defuss";

export type DropMode = "click" | "hover" | "click,hover";
export type DropPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "left-top"
  | "left-center"
  | "left-bottom"
  | "right-top"
  | "right-center"
  | "right-bottom";
export type DropStretch = boolean | "x" | "y";
export type DropAnimation =
  | "uk-anmt-fade"
  | "slide-top"
  | "slide-bottom"
  | "slide-left"
  | "slide-right"
  | "reveal-top"
  | "reveal-bottom"
  | "reveal-left"
  | "reveal-right"
  | string; // allow custom

export interface DropOptions {
  mode?: DropMode;
  pos?: DropPosition;
  stretch?: DropStretch;
  delayShow?: number;
  delayHide?: number;
  autoUpdate?: boolean;
  boundary?: string;
  boundaryX?: string;
  boundaryY?: string;
  target?: string | boolean;
  targetX?: string | boolean;
  targetY?: string | boolean;
  inset?: boolean;
  flip?: boolean;
  shift?: boolean;
  offset?: number;
  animation?: DropAnimation;
  animateOut?: boolean;
  bgScroll?: boolean;
  closeOnScroll?: boolean;
  duration?: number;
  container?: string | boolean;
  [key: string]: any;
}

export interface DropProps extends Props {
  className?: string;
  ref?: Ref;
  options?: DropOptions; // all data-uk-drop options as one object
  animation?: DropAnimation; // (alias for options.animation)
  mode?: DropMode; // (alias)
  pos?: DropPosition;
  stretch?: DropStretch;
  delayShow?: number;
  delayHide?: number;
  autoUpdate?: boolean;
  boundary?: string;
  boundaryX?: string;
  boundaryY?: string;
  target?: string | boolean;
  targetX?: string | boolean;
  targetY?: string | boolean;
  inset?: boolean;
  flip?: boolean;
  shift?: boolean;
  offset?: number;
  animateOut?: boolean;
  bgScroll?: boolean;
  closeOnScroll?: boolean;
  duration?: number;
  container?: string | boolean;
  parentIcon?: boolean; // enables data-uk-drop-parent-icon on outer
  toggle?: VNode; // The toggle button (otherwise children[0])
  children?: VNode; // Drop content if toggle is separate, else children[1:]
  [key: string]: any;
}

function buildUkDropOptions({ options = {}, ...props }: DropProps) {
  // Merge props and options (explicit props override)
  const merged = { ...options, ...props };

  // Only take relevant keys
  const keyOrder = [
    "mode",
    "pos",
    "stretch",
    "delayShow",
    "delayHide",
    "autoUpdate",
    "boundary",
    "boundaryX",
    "boundaryY",
    "target",
    "targetX",
    "targetY",
    "inset",
    "flip",
    "shift",
    "offset",
    "animation",
    "animateOut",
    "bgScroll",
    "closeOnScroll",
    "duration",
    "container",
  ];
  const opts: string[] = [];
  keyOrder.forEach((k) => {
    if (merged[k] !== undefined) {
      // kebab-case everything but camelcase for delayShow/delayHide etc (Franken spec is dash case)
      const ukKey = k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
      if (typeof merged[k] === "boolean") {
        opts.push(`${ukKey}: ${merged[k] ? "true" : "false"}`);
      } else {
        opts.push(`${ukKey}: ${merged[k]}`);
      }
    }
  });
  return opts.length ? opts.join("; ") : undefined;
}

export const Drop = ({
  className = "",
  ref = createRef(),
  parentIcon = false,
  options,
  toggle,
  children,
  ...props
}: DropProps) => {
  let toggleNode = toggle;
  let dropContent: VNode | VNode[] | null = null;

  if (toggleNode) {
    dropContent = children ?? null;
  } else if (Array.isArray(children)) {
    toggleNode = children[0];
    dropContent = children.length > 1 ? children.slice(1) : null;
  } else {
    dropContent = children ?? null;
  }

  const dataUkDrop = buildUkDropOptions({ ...props, options });

  // Get drop-specific className, and prevent double-className assignment
  const { dropClassName = "", target, ...restProps } = props;

  return (
    <div
      className={["uk-inline", className].filter(Boolean).join(" ")}
      {...(parentIcon ? { "data-uk-drop-parent-icon": true } : {})}
      ref={ref}
    >
      {toggleNode}
      <div
        className={["uk-drop", dropClassName].filter(Boolean).join(" ")}
        data-uk-drop={dataUkDrop}
        tabIndex={-1}
        {...restProps}
      >
        {dropContent}
      </div>
    </div>
  );
};
