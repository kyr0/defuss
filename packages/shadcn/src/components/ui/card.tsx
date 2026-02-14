import type { ElementProps, FC } from "defuss";
import { cn } from "../../utilities/cn.js";

export type CardProps = ElementProps<HTMLDivElement>;
export type CardHeaderProps = ElementProps<HTMLElement>;
export type CardTitleProps = ElementProps<HTMLHeadingElement>;
export type CardDescriptionProps = ElementProps<HTMLParagraphElement>;
export type CardContentProps = ElementProps<HTMLElement>;
export type CardFooterProps = ElementProps<HTMLElement>;

export const Card: FC<CardProps> = ({ className, children, ...props }) => (
    <div class={cn("card", className)} {...props}>
        {children}
    </div>
);

export const CardHeader: FC<CardHeaderProps> = ({ className, children, ...props }) => (
    <header class={cn(className)} {...props}>
        {children}
    </header>
);

export const CardTitle: FC<CardTitleProps> = ({ className, children, ...props }) => (
    <h2 class={cn(className)} {...props}>
        {children}
    </h2>
);

export const CardDescription: FC<CardDescriptionProps> = ({ className, children, ...props }) => (
    <p class={cn(className)} {...props}>
        {children}
    </p>
);

export const CardContent: FC<CardContentProps> = ({ className, children, ...props }) => (
    <section class={cn(className)} {...props}>
        {children}
    </section>
);

export const CardFooter: FC<CardFooterProps> = ({ className, children, ...props }) => (
    <footer class={cn(className)} {...props}>
        {children}
    </footer>
);
