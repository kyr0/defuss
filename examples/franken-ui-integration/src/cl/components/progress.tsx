import { createRef, type Props, type Ref } from "defuss";

/** Example usage:

<Progress value={50} max={100} />
<Progress value={7} min={0} max={10} />
<Progress value={80} className="bg-primary" />

 */

export interface ProgressProps extends Props {
  value?: number;
  max?: number;
  min?: number;
  className?: string;
  ref?: Ref;
  children?: never;
  [key: string]: any;
}

/**
 * Progress
 * - Always renders as <progress class="uk-progress" value={value} max={max} ... />
 * - Supports min/max/value, extra className, ref, and HTML attributes.
 */
export const Progress = ({
  value,
  max = 100,
  min,
  className = "",
  ref = createRef(),
  ...props
}: ProgressProps) => (
  <progress
    ref={ref}
    className={["uk-progress", className].filter(Boolean).join(" ")}
    value={value}
    max={max}
    min={min}
    {...props}
  />
);
