import type { ElementProps, FC } from "defuss";
import { cn } from "../../utilities/cn.js";

export type CheckboxProps = ElementProps<HTMLInputElement> & {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
};

export const Checkbox: FC<CheckboxProps> = ({
    className,
    checked,
    onCheckedChange,
    ...props
}) => {
    return (
        <input
            type="checkbox"
            class={cn("input", className)}
            checked={checked}
            onChange={(e) => onCheckedChange?.((e.target as HTMLInputElement).checked)}
            {...props}
        />
    );
};
