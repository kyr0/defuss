import { createRef, type Props, type Ref, type VNode } from "defuss";

/** Example usage:

<OffcanvasLayout overlay mode="push" flip>
  <OffcanvasBar>
    <button className="uk-offcanvas-close" data-uk-close="" aria-label="Close"></button>
    <nav>Sidebar/content/navigation</nav>
  </OffcanvasBar>
</OffcanvasLayout>

 */

export type OffcanvasMode = "slide" | "push" | "reveal" | "none";

export interface OffcanvasLayoutProps extends Props {
  mode?: OffcanvasMode;
  flip?: boolean;
  overlay?: boolean;
  escClose?: boolean;
  bgClose?: boolean;
  container?: string | boolean;
  className?: string;
  ref?: Ref;
  children?: VNode;
  [key: string]: any;
}

function buildUkOffcanvasOptions({
  mode,
  flip,
  overlay,
  escClose,
  bgClose,
  container,
}: Partial<OffcanvasLayoutProps>) {
  const opts = [];
  if (mode) opts.push(`mode: ${mode}`);
  if (flip !== undefined) opts.push(`flip: ${!!flip}`);
  if (overlay !== undefined) opts.push(`overlay: ${!!overlay}`);
  if (escClose !== undefined) opts.push(`esc-close: ${!!escClose}`);
  if (bgClose !== undefined) opts.push(`bg-close: ${!!bgClose}`);
  if (container !== undefined)
    opts.push(
      `container: ${typeof container === "string" ? container : container === false ? "false" : container}`,
    );
  return opts.length ? opts.join("; ") : undefined;
}

export const OffcanvasLayout = ({
  className = "",
  ref = createRef(),
  mode,
  flip,
  overlay,
  escClose,
  bgClose,
  container,
  children,
  ...props
}: OffcanvasLayoutProps) => {
  const dataUkOffcanvas = buildUkOffcanvasOptions({
    mode,
    flip,
    overlay,
    escClose,
    bgClose,
    container,
  });
  return (
    <div
      ref={ref}
      className={["uk-offcanvas", className].filter(Boolean).join(" ")}
      data-uk-offcanvas={dataUkOffcanvas}
      {...props}
    >
      {children}
    </div>
  );
};

export interface OffcanvasBarProps extends Props {
  className?: string;
  ref?: Ref;
  children?: VNode;
  [key: string]: any;
}
export const OffcanvasBar = ({
  className = "",
  ref = createRef(),
  children,
  ...props
}: OffcanvasBarProps) => (
  <div
    ref={ref}
    className={["uk-offcanvas-bar", className].filter(Boolean).join(" ")}
    {...props}
  >
    {children}
  </div>
);
