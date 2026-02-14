import type { ElementProps, FC } from "defuss";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utilities/cn.js";

export const alertVariants = cva(
    "alert w-full relative",
    {
        variants: {
            variant: {
                default: "",
                destructive: "alert-destructive",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

export type AlertProps =
    ElementProps<HTMLDivElement> &
    VariantProps<typeof alertVariants>;

export type AlertTitleProps = ElementProps<HTMLHeadingElement>;
export type AlertDescriptionProps = ElementProps<HTMLElement>;
export type AlertActionProps = ElementProps<HTMLElement>;

export const Alert: FC<AlertProps> = ({ className, variant, children, ...props }) => {
    return (
        <div
            role="alert"
            class={cn(alertVariants({ variant }), className)}
            {...props}
        >
            {children}
        </div>
    );
};

export const AlertTitle: FC<AlertTitleProps> = ({ className, children, ...props }) => {
    return (
        <h2
            class={cn(className)}
            {...props}
        >
            {children}
        </h2>
    );
};

export const AlertDescription: FC<AlertDescriptionProps> = ({ className, children, ...props }) => {
    return (
        <section
            class={cn(className)}
            {...props}
        >
            {children}
        </section>
    );
};

export const AlertAction: FC<AlertActionProps> = ({ className, children, ...props }) => {
    return (
        <footer
            class={cn("col-start-2 mt-1", className)}
            {...props}
        >
            {children}
        </footer>
    );
};
