import { createRef, type Props, type Ref, type VNode } from "defuss";

export interface MenuProps extends Props {
  label: string | VNode;
  buttonClassName?: string;
  dropClassName?: string;
  navClassName?: string;
  ref?: Ref;
  children?: VNode;
  [key: string]: any;
}

export const Menu = ({
  label,
  className = "",
  buttonClassName = "",
  dropClassName = "",
  navClassName = "",
  ref = createRef(),
  children,
  ...props
}: MenuProps) => (
  <div
    className={["menu", className].filter(Boolean).join(" ")}
    ref={ref}
    {...props}
    style={{ display: "inline-block" }}
  >
    <button
      className={["uk-btn uk-btn-default mr-2", buttonClassName]
        .filter(Boolean)
        .join(" ")}
      type="button"
    >
      {label}
    </button>
    <div
      className={["uk-drop uk-dropdown min-w-52", dropClassName]
        .filter(Boolean)
        .join(" ")}
      data-uk-dropdown="animation: uk-anmt-slide-top-sm"
    >
      <ul
        className={["uk-nav uk-dropdown-nav", navClassName]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </ul>
    </div>
  </div>
);

export interface MenuItemProps extends Props {
  active?: boolean;
  href?: string;
  children?: VNode;
  className?: string;
  [key: string]: any;
}
export const MenuItem = ({
  active = false,
  href = "#",
  children,
  className = "",
  ...props
}: MenuItemProps) => (
  <li
    className={[active && "uk-active", className].filter(Boolean).join(" ")}
    {...props}
  >
    <a href={href}>{children}</a>
  </li>
);

export interface MenuHeaderProps extends Props {
  children?: VNode;
  className?: string;
}
export const MenuHeader = ({
  children,
  className = "",
  ...props
}: MenuHeaderProps) => (
  <li
    className={["uk-nav-header", className].filter(Boolean).join(" ")}
    {...props}
  >
    {children}
  </li>
);

export interface MenuDividerProps extends Props {
  className?: string;
}
export const MenuDivider = ({ className = "", ...props }: MenuDividerProps) => (
  <li
    className={["uk-nav-divider", className].filter(Boolean).join(" ")}
    {...props}
  />
);
