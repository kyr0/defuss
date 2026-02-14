import type { ElementProps, FC } from "defuss";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utilities/cn.js";

const itemVariants = cva(
    "group/item flex items-center border text-sm rounded-md transition-colors [a]:hover:bg-accent/50 [a]:transition-colors duration-100 flex-wrap outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] gap-4",
    {
        variants: {
            variant: {
                default: "border-transparent",
                outline: "border-border",
                muted: "border-transparent bg-muted/50",
            },
            size: {
                default: "p-4",
                compact: "py-3 px-4 gap-2.5",
            },
        },
        defaultVariants: {
            variant: "outline",
            size: "default",
        },
    }
);

export type ItemProps = ElementProps<HTMLElement> & VariantProps<typeof itemVariants>;
export type ItemContentProps = ElementProps<HTMLDivElement>;
export type ItemTitleProps = ElementProps<HTMLHeadingElement>;
export type ItemDescriptionProps = ElementProps<HTMLParagraphElement>;
export type ItemLeadingProps = ElementProps<HTMLDivElement>;
export type ItemTrailingProps = ElementProps<HTMLDivElement>;

export const Item: FC<ItemProps> = ({ className, variant, size, children, ...props }) => (
    <article class={cn(itemVariants({ variant, size }), className)} {...props}>
        {children}
    </article>
);

export const ItemLeading: FC<ItemLeadingProps> = ({ className, children, ...props }) => (
    <div class={cn("flex shrink-0 items-center justify-center gap-2", className)} {...props}>
        {children}
    </div>
);

export const ItemContent: FC<ItemContentProps> = ({ className, children, ...props }) => (
    <div class={cn("flex flex-1 flex-col gap-1", className)} {...props}>
        {children}
    </div>
);

export const ItemTitle: FC<ItemTitleProps> = ({ className, children, ...props }) => (
    <h3 class={cn("flex w-fit items-center gap-2 text-sm leading-snug font-medium", className)} {...props}>
        {children}
    </h3>
);

export const ItemDescription: FC<ItemDescriptionProps> = ({ className, children, ...props }) => (
    <p class={cn("text-muted-foreground line-clamp-2 text-sm leading-normal font-normal text-balance [&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4", className)} {...props}>
        {children}
    </p>
);

export const ItemTrailing: FC<ItemTrailingProps> = ({ className, children, ...props }) => (
    <div class={cn("flex items-center gap-2", className)} {...props}>
        {children}
    </div>
);
