import type { ElementProps, FC } from "defuss";
import { cn } from "../../utilities/cn.js";

export type SkeletonProps = ElementProps<HTMLDivElement>;

export const Skeleton: FC<SkeletonProps> = ({ className, ...props }) => (
    <div class={cn("bg-accent animate-pulse rounded-md", className)} {...props} />
);
