import { createRef, type Props, type Ref, type VNode } from "defuss";

/** Example usage:
 
<Dotnav>
  <DotnavItem active href="#slide1" />
  <DotnavItem href="#slide2" />
  <DotnavItem href="#slide3" />
</Dotnav>

<Dotnav vertical>
  <DotnavItem active href="#slide1" />
  <DotnavItem href="#slide2" />
</Dotnav> 
 */

export interface DotnavProps extends Props {
  className?: string;
  ref?: Ref;
  vertical?: boolean;
  children?: VNode;
  [key: string]: any;
}

export const Dotnav = ({
  className = "",
  ref = createRef(),
  vertical = false,
  children,
  ...props
}: DotnavProps) => (
  <ul
    ref={ref}
    className={["uk-dotnav", vertical && "uk-dotnav-vertical", className]
      .filter(Boolean)
      .join(" ")}
    {...props}
  >
    {children}
  </ul>
);

export interface DotnavItemProps extends Props {
  active?: boolean;
  href?: string;
  className?: string;
  children?: VNode;
  [key: string]: any;
}
export const DotnavItem = ({
  active = false,
  href = "#",
  className = "",
  children,
  ...props
}: DotnavItemProps) => (
  <li
    className={[active && "uk-active", className].filter(Boolean).join(" ")}
    {...props}
  >
    <a href={href}>{children}</a>
  </li>
);
