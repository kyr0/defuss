import { createRef, type Props, type Ref, type VNode } from "defuss";

/** Example usage:
 
  <Badge>4</Badge>
  <Badge styleType="primary">New</Badge>
  <Badge styleType="secondary">Update</Badge>
  <Badge styleType="destructive">Removed</Badge>
*/

export type BadgeStyle = "primary" | "secondary" | "destructive";
export interface BadgeProps extends Props {
  styleType?: BadgeStyle;
  className?: string;
  ref?: Ref;
  children?: VNode;
  [key: string]: any;
}

export const Badge = ({
  styleType,
  className = "",
  ref = createRef(),
  children,
  ...props
}: BadgeProps) => {
  const styleClass =
    styleType === "primary"
      ? "uk-badge-primary"
      : styleType === "secondary"
        ? "uk-badge-secondary"
        : styleType === "destructive"
          ? "uk-badge-destructive"
          : "";
  const classes = ["uk-badge", styleClass, className].filter(Boolean).join(" ");
  return (
    <span ref={ref} className={classes} {...props}>
      {children}
    </span>
  );
};
