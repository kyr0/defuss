import type { ElementProps, FC, Ref } from "defuss";
import { createRef } from "defuss";
import { cn } from "../../utilities/cn.js";

export type TooltipProps = ElementProps<HTMLDivElement> & {
  tooltip: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  delay?: number;
};

export const Tooltip: FC<TooltipProps> = ({
  className,
  tooltip,
  side,
  align,
  delay,
  children,
  style,
  ref = createRef() as Ref<HTMLDivElement>,
  ...props
}) => {
  const tooltipRef = ref || createRef<HTMLDivElement>();
  const mergedStyle =
    delay != null ? `--tooltip-delay:${delay}ms;${style || ""}` : style;

  return (
    <div
      ref={tooltipRef}
      data-tooltip={tooltip}
      data-side={side}
      data-align={align}
      data-delay={delay != null ? String(delay) : undefined}
      class={cn(className)}
      style={mergedStyle}
      {...props}
    >
      {children}
    </div>
  );
};
