import type { ElementProps, FC } from "defuss";
import { cn } from "../../utilities/cn.js";

export type SelectProps = ElementProps<HTMLSelectElement>;

export const Select: FC<SelectProps> = ({ className, children, ...props }) => {
    return (
        <select
            class={cn("select", className)}
            {...props}
        >
            {children}
        </select>
    );
};
