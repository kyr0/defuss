import type { ElementProps, FC } from "defuss";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utilities/cn.js";

export const buttonVariants = cva(
    "",
    {
        variants: {
            variant: {
                default: "btn",
                outline: "btn-outline",
                secondary: "btn-secondary",
                ghost: "btn-ghost",
                destructive: "btn-destructive",
                link: "btn-link",
            },
            size: {
                default: "",
                xs: "btn-xs",
                sm: "btn-sm",
                lg: "btn-lg",
                icon: "btn-icon",
                "icon-xs": "btn-icon-xs",
                "icon-sm": "btn-icon-sm",
                "icon-lg": "btn-icon-lg",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export type ButtonProps =
    Omit<ElementProps<HTMLButtonElement>, 'size'> &
    VariantProps<typeof buttonVariants>;

export const Button: FC<ButtonProps> = ({ variant, size, className, children, ...props }) => {
    return (
        <button
            class={cn(buttonVariants({ variant, size }), className)}
            {...props}
        >
            {children}
        </button>
    );
};