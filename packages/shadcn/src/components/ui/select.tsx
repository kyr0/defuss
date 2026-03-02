import type { ElementProps, FC, Ref } from "defuss";
import { createRef } from "defuss";
import { cn } from "../../utilities/cn.js";

export type SelectProps = ElementProps<HTMLSelectElement>;

export const Select: FC<SelectProps> = ({
  className,
  children,
  ref = createRef() as Ref<HTMLSelectElement>,
  ...props
}) => {
  const selectRef = ref || createRef<HTMLSelectElement>();

  return (
    <select ref={selectRef} class={cn("select", className)} {...props}>
      {children}
    </select>
  );
};
