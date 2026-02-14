import type { ElementProps, FC } from "defuss";
import { cn } from "../../utilities/cn.js";

export type SwitchProps = ElementProps<HTMLInputElement> & {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
};

export const Switch: FC<SwitchProps> = ({
    className,
    checked,
    onCheckedChange,
    ...props
}) => {
    return (
        <input
            type="checkbox"
            role="switch"
            class={cn("input", className)}
            checked={checked}
            onChange={(e) => onCheckedChange?.((e.target as HTMLInputElement).checked)}
            {...props}
        />
    );
};
