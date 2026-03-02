import type { ElementProps, FC, Ref } from "defuss";
import { createRef } from "defuss";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utilities/cn.js";

export const badgeVariants = cva("", {
  variants: {
    variant: {
      default: "badge",
      secondary: "badge-secondary",
      destructive: "badge-destructive",
      outline: "badge-outline",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export type BadgeProps = ElementProps<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export const Badge: FC<BadgeProps> = ({
  className,
  variant,
  children,
  ref = createRef() as Ref<HTMLSpanElement>,
  ...props
}) => {
  const badgeRef = ref || createRef<HTMLSpanElement>();

  return (
    <span
      ref={badgeRef}
      class={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {children}
    </span>
  );
};
