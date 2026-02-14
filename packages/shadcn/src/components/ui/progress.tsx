import type { ElementProps, FC } from "defuss";
import { cn } from "../../utilities/cn.js";

export type ProgressProps = ElementProps<HTMLDivElement> & {
    value?: number;
    max?: number;
};

export const Progress: FC<ProgressProps> = ({ className, value = 0, max = 100, ...props }) => {
    const percentage = Math.max(0, Math.min(100, (value / max) * 100));

    return (
        <div
            class={cn("bg-primary/20 relative h-2 w-full overflow-hidden rounded-full", className)}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={value}
            {...props}
        >
            <div class="bg-primary h-full w-full flex-1 transition-all" style={`width: ${percentage}%`} />
        </div>
    );
};
