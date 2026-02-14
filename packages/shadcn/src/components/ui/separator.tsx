import type { ElementProps, FC } from "defuss";
import { cn } from "../../utilities/cn.js";

export type SeparatorProps = ElementProps<HTMLHRElement> & {
    orientation?: "horizontal" | "vertical";
};

export const Separator: FC<SeparatorProps> = ({
    className,
    orientation = "horizontal",
    ...props
}) => {
    return (
        <hr
            role="separator"
            aria-orientation={orientation}
            class={cn(className)}
            {...props}
        />
    );
};
