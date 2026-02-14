import { createRef, type Props, type Ref, type VNode } from "defuss";

/**
 * Example usage:
 * <Label modifier="primary">Important</Label>
 */

export interface LabelProps extends Props<HTMLSpanElement> {
  className?: string;
  modifier?: "primary" | "secondary" | "destructive";
  children?: VNode;
  [key: string]: any; // Allow additional HTML attributes
}

export const Label = ({
  className = "",
  ref = createRef(),
  modifier,
  children,
  ...props
}: LabelProps) => {
  const baseClass = "uk-label";
  const modifierClass = modifier ? `uk-label-${modifier}` : "";
  const classes = [baseClass, modifierClass, className]
    .filter(Boolean)
    .join(" ");

  return (
    <span ref={ref} class={classes} {...props}>
      {children}
    </span>
  );
};
