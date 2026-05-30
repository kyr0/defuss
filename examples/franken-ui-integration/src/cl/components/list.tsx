import { createRef, type Props, type Ref, type VNode } from "defuss";

export type ListType =
  | "disc"
  | "circle"
  | "square"
  | "decimal"
  | "hyphen"
  | "bullet";

export type ListColor = "muted" | "primary" | "secondary";
export interface ListProps extends Props {
  ref?: Ref;
  as?: "ul" | "ol";
  type?: ListType; // marker type
  color?: ListColor;
  divider?: boolean;
  striped?: boolean;
  imageBullet?: boolean; // synonym for type: "bullet"
  className?: string;
  role?: string;
  // element children are list items as <li> (ideally)
  children?: VNode;
  [key: string]: any;
}

export const List = ({
  ref = createRef(),
  as = "ul",
  type,
  color,
  divider = false,
  striped = false,
  imageBullet = false,
  className = "",
  role,
  children,
  ...props
}: ListProps) => {
  // Compose modifier classes
  const baseClass = "uk-list";
  const typeClass = imageBullet
    ? "uk-list-bullet"
    : type === "disc"
      ? "uk-list-disc"
      : type === "circle"
        ? "uk-list-circle"
        : type === "square"
          ? "uk-list-square"
          : type === "decimal"
            ? "uk-list-decimal"
            : type === "hyphen"
              ? "uk-list-hyphen"
              : "";
  // Note: bullet overrides all color/type mods (per docs)
  const colorClass = imageBullet
    ? "" // not combinable
    : color === "muted"
      ? "uk-list-muted"
      : color === "primary"
        ? "uk-list-primary"
        : color === "secondary"
          ? "uk-list-secondary"
          : "";
  const dividerClass = divider ? "uk-list-divider" : "";
  const stripedClass = striped ? "uk-list-striped" : "";
  const classes = [
    baseClass,
    typeClass,
    colorClass,
    dividerClass,
    stripedClass,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // Only allow accessible roles if specified, otherwise let HTML handle it
  return {
    type: as,
    attributes: { ref, class: classes, role, ...props },
    children,
  } as VNode;
  // Means:
  // <tag ref={ref} class={classes} role={role} {...props}>
  //   {children}
  // </tag>
};
