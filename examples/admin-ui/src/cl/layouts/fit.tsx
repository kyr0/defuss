import { createRef, type Props, type Ref, type VNode } from "defuss";

/** Example usage:

<FitLayout>
  <YourComponent />
</FitLayout>

<FitLayout center>
  <div>Centered both directions!</div>
</FitLayout>
 * 
*/

export interface FitLayoutProps extends Props {
  center?: boolean;
  className?: string;
  ref?: Ref;
  style?: any;
  children?: VNode;
  [key: string]: any;
}

/**
 * FitLayout
 * - Expands to fill its parent (w-full h-full, or abs/inset-0 if needed)
 * - If center is true, aligns children in center both directions
 */
export const FitLayout = ({
  center = false,
  className = "",
  ref = createRef(),
  style = {},
  children,
  ...props
}: FitLayoutProps) => {
  const baseClass = center
    ? "fitlayout flex items-center justify-center w-full h-full"
    : "fitlayout w-full h-full";
  const classes = [baseClass, className].filter(Boolean).join(" ");

  return (
    <div
      ref={ref}
      className={classes}
      style={{
        position: "relative",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};
