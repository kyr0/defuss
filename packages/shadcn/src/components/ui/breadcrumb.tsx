import type { ElementProps, FC } from "defuss";
import { cn } from "../../utilities/cn.js";

export type BreadcrumbProps = ElementProps<HTMLElement>;
export type BreadcrumbListProps = ElementProps<HTMLOListElement>;
export type BreadcrumbItemProps = ElementProps<HTMLLIElement>;
export type BreadcrumbLinkProps = ElementProps<HTMLAnchorElement>;
export type BreadcrumbPageProps = ElementProps<HTMLSpanElement>;
export type BreadcrumbSeparatorProps = ElementProps<HTMLLIElement>;

export const Breadcrumb: FC<BreadcrumbProps> = ({ className, children, ...props }) => (
    <nav class={cn(className)} aria-label="Breadcrumb" {...props}>{children}</nav>
);

export const BreadcrumbList: FC<BreadcrumbListProps> = ({ className, children, ...props }) => (
    <ol class={cn("text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5", className)} {...props}>{children}</ol>
);

export const BreadcrumbItem: FC<BreadcrumbItemProps> = ({ className, children, ...props }) => (
    <li class={cn("inline-flex items-center gap-1.5", className)} {...props}>{children}</li>
);

export const BreadcrumbLink: FC<BreadcrumbLinkProps> = ({ className, children, ...props }) => (
    <a class={cn("hover:text-foreground transition-colors", className)} {...props}>{children}</a>
);

export const BreadcrumbPage: FC<BreadcrumbPageProps> = ({ className, children, ...props }) => (
    <span class={cn("text-foreground font-normal", className)} aria-current="page" {...props}>{children}</span>
);

export const BreadcrumbSeparator: FC<BreadcrumbSeparatorProps> = ({ className, children, ...props }) => (
    <li class={cn(className)} aria-hidden="true" {...props}>{children || "›"}</li>
);
