import { createRef, type Props, type Ref, type VNode } from "defuss";

export interface BreadcrumbProps extends Props {
  className?: string;
  ariaLabel?: string;
  ref?: Ref;
  children?: VNode;
  [key: string]: any;
}

/**
 * Usage:
 * <Breadcrumb>
 *   <BreadcrumbItem href="/">Home</BreadcrumbItem>
 *   <BreadcrumbItem href="/docs">Docs</BreadcrumbItem>
 *   <BreadcrumbItem current>Current Page</BreadcrumbItem>
 * </Breadcrumb>
 */
export const Breadcrumb = ({
  className = "",
  ariaLabel = "Breadcrumb",
  ref = createRef(),
  children,
  ...props
}: BreadcrumbProps) => (
  <nav aria-label={ariaLabel}>
    <ul
      ref={ref}
      className={["uk-breadcrumb", className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </ul>
  </nav>
);

export interface BreadcrumbItemProps extends Props {
  href?: string;
  current?: boolean;
  className?: string;
  children?: VNode;
  [key: string]: any;
}

export const BreadcrumbItem = ({
  href,
  current = false,
  className = "",
  children,
  ...props
}: BreadcrumbItemProps) => (
  <li className={className} {...props}>
    {href && !current ? (
      <a href={href}>{children}</a>
    ) : current ? (
      <a aria-current="page">{children}</a>
    ) : (
      <span>{children}</span>
    )}
  </li>
);
