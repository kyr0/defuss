import type { ElementProps, FC } from "defuss";
import { cn } from "../../utilities/cn.js";

export type RadioGroupProps = ElementProps<HTMLDivElement> & {
    value?: string;
    onValueChange?: (value: string) => void;
    name?: string;
};

export type RadioGroupItemProps = ElementProps<HTMLInputElement> & {
    value: string;
};

export const RadioGroup: FC<RadioGroupProps> = ({
    className,
    value,
    onValueChange,
    name,
    children,
    ...props
}) => {
    return (
        <div
            role="radiogroup"
            class={cn(className)}
            {...props}
        >
            {children}
        </div>
    );
};

export const RadioGroupItem: FC<RadioGroupItemProps> = ({
    className,
    value,
    ...props
}) => {
    return (
        <input
            type="radio"
            value={value}
            class={cn("input", className)}
            {...props}
        />
    );
};
