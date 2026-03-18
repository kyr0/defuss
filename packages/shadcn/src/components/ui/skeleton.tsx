import type { ElementProps, FC, Ref } from "defuss";
import { createRef } from "defuss";
import { cn } from "../../utilities/cn.js";

export type SkeletonProps = ElementProps<HTMLDivElement>;

export const Skeleton: FC<SkeletonProps> = ({
  className,
  ref = createRef() as Ref<HTMLDivElement>,
  ...props
}) => {
  const skeletonRef = ref || createRef<HTMLDivElement>();

  return (
    <div
      ref={skeletonRef}
      class={cn("defuss-skeleton", className)}
      {...props}
    />
  );
};
