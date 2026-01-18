import { createRef, type Props, type Ref, type VNode } from "defuss";

/** Example usage:

<Pagination styleType="primary" size="sm" className="justify-center">
  <PaginationItem prev aria-label="Previous page" />
  <PaginationItem href="/page/1">1</PaginationItem>
  <PaginationItem active>2</PaginationItem>
  <PaginationItem href="/page/3">3</PaginationItem>
  <PaginationItem next aria-label="Next page" />
</Pagination>

*/

// All style and size modifiers for Franken UI v2.1 Pagination
export type PaginationStyle =
  | "default"
  | "primary"
  | "secondary"
  | "destructive"
  | "ghost";
export type PaginationSize = "xs" | "sm" | "md" | "lg";

export interface PaginationProps extends Props {
  styleType?: PaginationStyle;
  size?: PaginationSize;
  className?: string;
  ref?: Ref;
  children?: VNode;
  // Use flex/layout utilities for alignment as desired
  [key: string]: any;
}

// Main Pagination container (ul.uk-pgn)
export const Pagination = ({
  styleType = "default",
  size,
  className = "",
  ref = createRef(),
  children,
  ...props
}: PaginationProps) => {
  const styleClass =
    styleType === "primary"
      ? "uk-pgn-primary"
      : styleType === "secondary"
        ? "uk-pgn-secondary"
        : styleType === "destructive"
          ? "uk-pgn-destructive"
          : styleType === "ghost"
            ? "uk-pgn-ghost"
            : "uk-pgn-default";
  const sizeClass = size ? `uk-pgn-${size}` : "";
  const classes = ["uk-pgn", styleClass, sizeClass, className]
    .filter(Boolean)
    .join(" ");

  return (
    <ul ref={ref} className={classes} {...props}>
      {children}
    </ul>
  );
};

export interface PaginationItemProps extends Props {
  active?: boolean;
  disabled?: boolean;
  href?: string;
  "aria-label"?: string;
  className?: string;
  children?: VNode;
  prev?: boolean;
  next?: boolean;
  [key: string]: any;
}
export const PaginationItem = ({
  active = false,
  disabled = false,
  prev = false,
  next = false,
  href = "#",
  className = "",
  children,
  "aria-label": ariaLabel,
  ...props
}: PaginationItemProps) => (
  <li
    className={[active && "uk-active", disabled && "uk-disabled", className]
      .filter(Boolean)
      .join(" ")}
    {...props}
  >
    {disabled ? (
      <span
        {...(prev
          ? { "data-uk-pgn-previous": true }
          : next
            ? { "data-uk-pgn-next": true }
            : {})}
        role={prev || next ? "button" : undefined}
        aria-label={ariaLabel}
        tabIndex={-1}
        aria-disabled="true"
      >
        {children}
      </span>
    ) : active ? (
      <span aria-current="page">{children}</span>
    ) : (
      <a
        href={href}
        {...(prev
          ? { "data-uk-pgn-previous": true }
          : next
            ? { "data-uk-pgn-next": true }
            : {})}
        role={prev || next ? "button" : undefined}
        aria-label={ariaLabel}
      >
        {children}
      </a>
    )}
  </li>
);
