import type { ElementProps, FC, Ref } from "defuss";
import { createRef } from "defuss";
import { cn } from "../../utilities/cn.js";

export type ButtonGroupProps = ElementProps<HTMLDivElement> & {
  orientation?: "horizontal" | "vertical";
};

export const ButtonGroup: FC<ButtonGroupProps> = ({
  orientation = "horizontal",
  className,
  children,
  ref = createRef() as Ref<HTMLDivElement>,
  ...props
}) => {
  const groupRef = ref || createRef<HTMLDivElement>();

  return (
    <div
      ref={groupRef}
      role="group"
      class={cn("button-group", className)}
      data-orientation={orientation}
      {...props}
    >
      {children}
    </div>
  );
};
