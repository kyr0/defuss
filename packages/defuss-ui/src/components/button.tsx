import type { Props, VNode } from "defuss";

export interface ButtonProps extends Props {
  type?:
    | "default"
    | "primary"
    | "ghost"
    | "secondary"
    | "destructive"
    | "text"
    | "link";
  size?: "xs" | "sm" | "md" | "lg";
  icon?: VNode;
  iconOnly?: boolean;
  className?: string;
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  as?: "button" | "a";
  href?: string;
}

export const Button = ({
  children,
  type = "default",
  size,
  icon,
  iconOnly = false,
  className = "",
  fullWidth = false,
  loading = false,
  disabled = false,
  as = "button",
  href,
  ...props
}: ButtonProps) => {
  const baseClass = "uk-btn";
  const typeClass = `uk-btn-${type}`;
  const sizeClass = size ? `uk-btn-${size}` : "";
  const iconClass = iconOnly ? "uk-btn-icon" : "";
  const widthClass = fullWidth ? "w-full" : "";

  const classes = [
    baseClass,
    typeClass,
    sizeClass,
    iconClass,
    widthClass,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {loading && <span className="uk-spinner" />}
      {icon}
      {!iconOnly && children}
    </>
  );

  if (as === "a" && href) {
    return (
      <a href={href} className={classes} aria-disabled={disabled} {...props}>
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {content}
    </button>
  );
};
