import type { ElementProps, FC } from "defuss";
import { cn } from "../../utilities/cn.js";

export type TooltipProps = ElementProps<HTMLDivElement> & {
    tooltip: string;
    side?: "top" | "bottom" | "left" | "right";
    align?: "start" | "center" | "end";
};

export const Tooltip: FC<TooltipProps> = ({
    className,
    tooltip,
    side,
    align,
    children,
    ...props
}) => {
    return (
        <div
            data-tooltip={tooltip}
            data-side={side}
            data-align={align}
            class={cn(className)}
            {...props}
        >
            {children}
        </div>
    );
};
