import type { ElementProps, FC } from "defuss";
import { cn } from "../../utilities/cn.js";

export type TextareaProps = ElementProps<HTMLTextAreaElement>;

export const Textarea: FC<TextareaProps> = ({ className, ...props }) => {
    return (
        <textarea class={cn("textarea", className)} {...props} />
    );
};
