import type { ElementProps, FC, Ref } from "defuss";
import { createRef } from "defuss";
import { cn } from "../../utilities/cn.js";

export type CheckboxProps = ElementProps<HTMLInputElement> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

export const Checkbox: FC<CheckboxProps> = ({
  className,
  checked,
  onCheckedChange,
  ref = createRef() as Ref<HTMLInputElement>,
  ...props
}) => {
  const checkboxRef = ref || createRef<HTMLInputElement>();

  return (
    <input
      ref={checkboxRef}
      type="checkbox"
      class={cn("input", className)}
      checked={checked}
      onChange={(e) =>
        onCheckedChange?.((e.target as HTMLInputElement).checked)
      }
      {...props}
    />
  );
};
