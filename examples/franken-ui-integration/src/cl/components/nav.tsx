import { createRef, type Props, type Ref, type VNode } from "defuss";

export interface NavItem {
  label: string;
  href?: string;
  active?: boolean;
  header?: boolean;
  divider?: boolean;
  subtitle?: string;
  icon?: VNode;
  children?: NavItem[];
  [key: string]: any; // allow extra props
}

export interface NavProps extends Props {
  items: NavItem[];
  className?: string;
  ref?: Ref;
  modifier?: "default" | "primary" | "secondary" | "dropdown";
  accordion?: boolean;
  parentIcon?: boolean;
  multiple?: boolean;
  // only nav root tag is allowed for materialization
  [key: string]: any;
}

export const Nav = ({
  items,
  className = "",
  ref = createRef(),
  modifier = "default",
  accordion = false,
  parentIcon = false,
  multiple = false,
  ...props
}: NavProps) => {
  const baseClass = "uk-nav";
  const modifierClass = modifier ? `uk-nav-${modifier}` : "";
  const classes = [baseClass, modifierClass, className].filter(Boolean);

  // Data attributes for accordion/parent icons
  const navAttrs: Record<string, any> = {};
  if (accordion) navAttrs["data-uk-nav"] = multiple ? "multiple: true" : true;
  if (parentIcon) navAttrs["data-uk-nav-parent-icon"] = "";

  function renderItems(items: NavItem[], isSub = false) {
    return (
      <ul class={isSub ? "uk-nav-sub" : undefined}>
        {items.map((item, i) => {
          if (item.header) {
            return (
              <li class="uk-nav-header" key={`${item.label}_header${i}`}>
                {item.label}
              </li>
            );
          }
          if (item.divider) {
            return (
              <li class="uk-nav-divider" key={`${item.label}_divider${i}`} />
            );
          }
          const itemClass = [
            item.active && "uk-active",
            item.children && "uk-parent",
            item.className,
          ].filter(Boolean);

          const {
            label,
            href,
            active,
            header,
            divider,
            subtitle,
            icon,
            children,
            className,
            ...htmlProps
          } = item;

          return (
            <li class={itemClass} key={`${item.label}${i}`} {...htmlProps}>
              <a href={item.href ?? "#"}>
                {item.icon}
                <span>
                  {item.label}
                  {item.subtitle && (
                    <div class="uk-nav-subtitle">{item.subtitle}</div>
                  )}
                </span>
              </a>
              {item.children && renderItems(item.children, true)}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <nav ref={ref} class={classes} {...navAttrs} {...props}>
      {renderItems(items)}
    </nav>
  );
};
