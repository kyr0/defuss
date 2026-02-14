import type { ElementProps, FC } from "defuss";
import { cn } from "../../utilities/cn.js";

export type FormProps = ElementProps<HTMLFormElement>;
export type FormFieldProps = ElementProps<HTMLDivElement>;

export const Form: FC<FormProps> = ({ className, children, ...props }) => (
    <form class={cn("form", className)} {...props}>{children}</form>
);

export const FormField: FC<FormFieldProps> = ({ className, children, ...props }) => (
    <div class={cn("field", className)} {...props}>{children}</div>
);
