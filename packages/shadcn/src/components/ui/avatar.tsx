import type { ElementProps, FC } from "defuss";
import { cn } from "../../utilities/cn.js";

export type AvatarProps = ElementProps<HTMLImageElement>;
export type AvatarFallbackProps = ElementProps<HTMLSpanElement>;
export type AvatarGroupProps = ElementProps<HTMLDivElement>;

export const Avatar: FC<AvatarProps> = ({ className, ...props }) => (
    <img
        class={cn("size-8 shrink-0 object-cover rounded-full", className)}
        {...props}
    />
);

export const AvatarFallback: FC<AvatarFallbackProps> = ({ className, children, ...props }) => (
    <span
        class={cn("size-8 shrink-0 rounded-full bg-muted text-muted-foreground inline-flex items-center justify-center text-xs font-medium", className)}
        {...props}
    >
        {children}
    </span>
);

export const AvatarGroup: FC<AvatarGroupProps> = ({ className, children, ...props }) => (
    <div
        class={cn("flex -space-x-2 [&_img]:ring-background [&_img]:ring-2 [&_img]:size-8 [&_img]:shrink-0 [&_img]:object-cover [&_img]:rounded-full", className)}
        {...props}
    >
        {children}
    </div>
);
