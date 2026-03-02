import type { ElementProps, FC, Ref } from "defuss";
import { createRef } from "defuss";
import { cn } from "../../utilities/cn.js";

export type SeparatorProps = ElementProps<HTMLHRElement> & {
  orientation?: "horizontal" | "vertical";
};

export const Separator: FC<SeparatorProps> = ({
  className,
  orientation = "horizontal",
  ref = createRef() as Ref<HTMLHRElement>,
  ...props
}) => {
  const separatorRef = ref || createRef<HTMLHRElement>();

  return (
    <hr
      ref={separatorRef}
      aria-orientation={orientation}
      class={cn(className)}
      {...props}
    />
  );
};
