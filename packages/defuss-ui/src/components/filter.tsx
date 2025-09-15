import { createRef, type Props, type Ref, type VNode } from "defuss";

export type FilterAnimation = "slide" | "fade" | "delayed-fade" | "false";
export interface FilterProps extends Props {
  as?: "div" | "section" | "nav";
  ref?: Ref;
  className?: string;
  target: string; // required, CSS selector for items to filter
  animation?: FilterAnimation; // slide/fade/delayed-fade/false
  duration?: number; // ms
  selActive?: string | boolean; // selector for initially active controls
  children?: VNode; // your layout: filter controls + filterable elements
  [key: string]: any;
}

/**
 * Compose data-uk-filter attribute value string.
 */
function buildUkFilterOptions({
  target,
  animation,
  duration,
  selActive,
}: Partial<FilterProps>): string {
  const opts = [];
  // Always include target; if it's the only option, it can be passed as just selector (not needed in this builder)
  if (target) opts.push(`target: ${target}`);
  if (animation !== undefined) opts.push(`animation: ${animation}`);
  if (duration !== undefined) opts.push(`duration: ${duration}`);
  if (selActive !== undefined)
    opts.push(`selActive: ${selActive === false ? "false" : selActive}`);
  return opts.length ? opts.join("; ") : "";
}

/**
 * Filter container for Franken UI v2.1.
 * Pass filter controls (Nav, Subnav, Tab, Button, etc.) and filterable elements as children.
 *
 * Filter controls: use data-uk-filter-control on any element.
 */
export const Filter = ({
  as = "div",
  ref = createRef(),
  className = "",
  target,
  animation,
  duration,
  selActive,
  children,
  ...props
}: FilterProps) => {
  const Tag = as;
  const dataUkFilter =
    buildUkFilterOptions({ target, animation, duration, selActive }) || target;

  return (
    <Tag
      ref={ref}
      className={["uk-filter", className].filter(Boolean).join(" ")}
      data-uk-filter={dataUkFilter}
      {...props}
    >
      {children}
    </Tag>
  );
};

/**
 * Helper: FilterControl renders a control element with data-uk-filter-control.
 * You can use this, or apply the attribute yourself to any element (Nav item, tab, button, etc).
 */
export interface FilterControlProps extends Props {
  as?: "li" | "button" | "a" | "div";
  filter?: string; // If only a selector, can be string instead of options
  group?: string;
  sort?: string;
  order?: "asc" | "desc";
  className?: string;
  children?: VNode;
  [key: string]: any;
}
export const FilterControl = ({
  as = "button",
  filter,
  group,
  sort,
  order,
  className = "",
  children,
  ...props
}: FilterControlProps) => {
  // Build data-uk-filter-control attribute value
  let value = "";
  const opts: string[] = [];
  if (filter) opts.push(`filter: ${filter}`);
  if (group) opts.push(`group: ${group}`);
  if (sort) opts.push(`sort: ${sort}`);
  if (order) opts.push(`order: ${order}`);
  value = opts.length > 0 ? opts.join("; ") : filter || "";

  const Tag = as;
  return (
    <Tag
      className={className}
      data-uk-filter-control={value || undefined}
      {...props}
    >
      {children}
    </Tag>
  );
};
