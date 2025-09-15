import { createRef, type Props, type Ref, type VNode } from "defuss";

/**
 * Example usage:
 * // Basic Grid usage
  <Grid masonry>
  
  </Grid>

  // Pack mode with parallax
  <Grid className="grid" masonry="pack" parallax={100}>

  </Grid>

  // Custom grid options
  <Grid margin="custom-margin" masonry="next" parallaxStart="10vh" parallaxEnd="90vh" parallaxJustify>

  </Grid>
 */

export type MasonryMode = boolean | "pack" | "next";
export type GridParallax = number | string;

export interface GridLayoutProps extends Props {
  className?: string;
  ref?: Ref;
  margin?: string;
  firstColumn?: string;
  masonry?: MasonryMode;
  parallax?: GridParallax;
  parallaxStart?: GridParallax;
  parallaxEnd?: GridParallax;
  parallaxJustify?: boolean;
  as?: "div" | "ul" | "ol" | "section"; // default: div
  children?: VNode;
  [key: string]: any; // allow only valid HTML/grid attributes
}

// Compose the string for uk-grid options
function buildUkGridOptions({
  margin,
  firstColumn,
  masonry,
  parallax,
  parallaxStart,
  parallaxEnd,
  parallaxJustify,
}: GridLayoutProps) {
  const opts = [];
  if (margin) opts.push(`margin: ${margin}`);
  if (firstColumn) opts.push(`first-column: ${firstColumn}`);
  if (masonry !== undefined)
    opts.push(
      typeof masonry === "string"
        ? `masonry: ${masonry}`
        : masonry === true
          ? "masonry: true"
          : "masonry: false",
    );
  if (parallax) opts.push(`parallax: ${parallax}`);
  if (parallaxStart) opts.push(`parallax-start: ${parallaxStart}`);
  if (parallaxEnd) opts.push(`parallax-end: ${parallaxEnd}`);
  if (parallaxJustify) opts.push("parallax-justify: true");
  return opts.length ? opts.join("; ") : "true";
}

export const GridLayout = ({
  className = "",
  ref = createRef(),
  as = "div",
  margin,
  firstColumn,
  masonry = true,
  parallax,
  parallaxStart,
  parallaxEnd,
  parallaxJustify,
  children,
  ...props
}: GridLayoutProps) => {
  const baseClass = "uk-grid";
  // Usually Franken UI grids need display: flex or grid, so we allow extra class names (e.g., 'flex grid')
  const classes = [baseClass, className].filter(Boolean).join(" ");
  const ukGridOpts = buildUkGridOptions({
    margin,
    firstColumn,
    masonry,
    parallax,
    parallaxStart,
    parallaxEnd,
    parallaxJustify,
  });

  // Only valid static tags permitted:
  const Tag = as || "div";

  return (
    <Tag ref={ref} class={classes} data-uk-grid={ukGridOpts} {...props}>
      {children}
    </Tag>
  );
};
