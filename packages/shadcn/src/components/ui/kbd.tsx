import type { ElementProps, FC } from "defuss";
import { cn } from "../../utilities/cn.js";

export type KbdProps = ElementProps<HTMLElement>;
export type KbdGroupProps = ElementProps<HTMLDivElement>;

export const Kbd: FC<KbdProps> = ({ className, children, ...props }) => {
    return (
        <kbd
            class={cn(
                "kbd pointer-events-none inline-flex items-center justify-center select-none",
                className
            )}
            {...props}
        >
            {children}
        </kbd>
    );
};

export const KbdGroup: FC<KbdGroupProps> = ({ className, children, ...props }) => {
    return (
        <div
            class={cn("kbd-group inline-flex items-center gap-1", className)}
            {...props}
        >
            {children}
        </div>
    );
};
