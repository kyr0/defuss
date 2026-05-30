import { createRef, type Props, type Ref, type VNode } from "defuss";

/**
 * Example usage:
 * <Link href="https://example.com">Normal link</Link>
<Link href="https://example.com" modifier="muted">Muted link</Link>
<Link href="https://example.com" modifier="text">Text Link</Link>
<Link href="https://example.com" modifier="reset">Reset Link</Link>
<Link href="https://example.com" modifier="toggle">Toggle Wrapper Link</Link>
 */

export interface LinkProps extends Props {
  className?: string;
  ref?: Ref;
  modifier?: "muted" | "text" | "reset" | "toggle";
  href?: string;
  children?: VNode;
  [key: string]: any; // Allow any other valid anchor props (target, rel, etc.)
}

export const Link = ({
  className = "",
  ref = createRef(),
  modifier,
  href = "#",
  children,
  ...props
}: LinkProps) => {
  const baseClass = "uk-link";
  const modifierClass =
    modifier === "muted"
      ? "uk-link-muted"
      : modifier === "text"
        ? "uk-link-text"
        : modifier === "reset"
          ? "uk-link-reset"
          : modifier === "toggle"
            ? "uk-link-toggle"
            : "";
  const classes = [baseClass, modifierClass, className]
    .filter(Boolean)
    .join(" ");

  return (
    <a ref={ref} class={classes} href={href} {...props}>
      {children}
    </a>
  );
};
