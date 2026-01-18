import { createRef, type Props, type Ref } from "defuss";

export interface DividerProps extends Props {
  vertical?: boolean;
  icon?: boolean;
  small?: boolean;
  as?: "hr" | "div";
  className?: string;
  ref?: Ref;
  [key: string]: any;
}

/**
 * Divider – renders a visual separator. Supports:
 * - horizontal (default) or vertical
 * - icon style
 * - small (sm) style
 * - renders as <hr> (default) or <div>
 */
export const Divider = ({
  vertical = false,
  icon = false,
  small = false,
  as = "hr",
  className = "",
  ref = createRef(),
  ...props
}: DividerProps) => {
  const baseClass = vertical ? "uk-divider-vertical" : "uk-hr";
  const iconClass = icon ? "uk-divider-icon" : "";
  const smallClass = small ? "uk-divider-sm" : "";
  const classes = [baseClass, iconClass, smallClass, className]
    .filter(Boolean)
    .join(" ");
  const Tag = as;
  return <Tag ref={ref} className={classes} {...props} />;
};
