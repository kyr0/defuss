import type { ElementProps, FC } from "defuss";
import { cn } from "../../utilities/cn.js";

export type LabelProps = ElementProps<HTMLLabelElement>;

export const Label: FC<LabelProps> = ({ className, children, ...props }) => {
    return (
        <label class={cn("label", className)} {...props}>
            {children}
        </label>
    );
};
