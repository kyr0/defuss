import type { ElementProps, FC } from "defuss";
import { cn } from "../../utilities/cn.js";

export type InputProps = ElementProps<HTMLInputElement> & {
    type?: string;
}

export const Input: FC<InputProps> = ({ className, type, ...props }) => {
    return (
        <input
            type={type}
            class={cn(
                "input",
                className
            )}
            {...props}
        />
    );
};