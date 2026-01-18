import { createRef, type Props, type Ref, type VNode } from "defuss";

/**
 * Example usage:
 * <Card
  modifier="primary"
  title="Primary card"
  header={<span>Header content</span>}
  footer={<span>Footer content</span>}
>
  Your body content here.
</Card>
 */

export interface CardProps extends Props {
  className?: string;
  ref?: Ref;
  modifier?: "primary" | "secondary" | "destructive";
  title?: VNode | string;
  header?: VNode;
  footer?: VNode;
  bodyClassName?: string;
  children?: VNode;
  // any HTML attributes:
  [key: string]: any;
}

export const Card = ({
  className = "",
  ref = createRef(),
  modifier,
  title,
  header,
  footer,
  bodyClassName = "",
  children,
  ...props
}: CardProps) => {
  const baseClass = "uk-card";
  const bodyClass = "uk-card-body";
  const modifierClass = modifier ? `uk-card-${modifier}` : "";
  const classes = [baseClass, modifierClass, className]
    .filter(Boolean)
    .join(" ");
  return (
    <div ref={ref} class={classes} {...props}>
      {header && <div class="uk-card-header">{header}</div>}
      <div class={`${bodyClass}${bodyClassName ? ` ${bodyClassName}` : ""}`}>
        {title && <h3 class="uk-card-title">{title}</h3>}
        {children}
      </div>
      {footer && <div class="uk-card-footer">{footer}</div>}
    </div>
  );
};
