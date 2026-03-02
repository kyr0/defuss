import type { ElementProps, FC, Ref } from "defuss";
import { createRef } from "defuss";
import { cn } from "../../utilities/cn.js";

export type RadioGroupProps = ElementProps<HTMLDivElement> & {
  value?: string;
  onValueChange?: (value: string) => void;
  name?: string;
};

export type RadioGroupItemProps = ElementProps<HTMLInputElement> & {
  value: string;
};

export const RadioGroup: FC<RadioGroupProps> = ({
  className,
  value,
  onValueChange,
  name,
  children,
  ref = createRef() as Ref<HTMLDivElement>,
  ...props
}) => {
  const radioGroupRef = ref || createRef<HTMLDivElement>();

  return (
    <div ref={radioGroupRef} role="radiogroup" class={cn(className)} {...props}>
      {children}
    </div>
  );
};

export const RadioGroupItem: FC<RadioGroupItemProps> = ({
  className,
  value,
  ...props
}) => {
  return (
    <input
      type="radio"
      value={value}
      class={cn("input", className)}
      {...props}
    />
  );
};
