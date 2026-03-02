import type { ElementProps, FC, Ref } from "defuss";
import { createRef } from "defuss";
import { cn } from "../../utilities/cn.js";

export type InputProps = ElementProps<HTMLInputElement> & {
  type?: string;
};

export const Input: FC<InputProps> = ({
  className,
  type,
  ref = createRef() as Ref<HTMLInputElement>,
  ...props
}) => {
  const inputRef = ref || createRef<HTMLInputElement>();

  return (
    <input
      ref={inputRef}
      type={type}
      class={cn("input", className)}
      {...props}
    />
  );
};
