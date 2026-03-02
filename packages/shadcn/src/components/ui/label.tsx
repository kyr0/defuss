import type { ElementProps, FC, Ref } from "defuss";
import { createRef } from "defuss";
import { cn } from "../../utilities/cn.js";

export type LabelProps = ElementProps<HTMLLabelElement>;

export const Label: FC<LabelProps> = ({
  className,
  children,
  ref = createRef() as Ref<HTMLLabelElement>,
  ...props
}) => {
  const labelRef = ref || createRef<HTMLLabelElement>();

  return (
    <label
      ref={labelRef}
      htmlFor={props.htmlFor}
      class={cn("label", className)}
      {...props}
    >
      {children}
    </label>
  );
};
