import type { ElementProps, FC, Ref } from "defuss";
import { createRef } from "defuss";
import { cn } from "../../utilities/cn.js";

export type SwitchProps = ElementProps<HTMLInputElement> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

export const Switch: FC<SwitchProps> = ({
  className,
  checked,
  onCheckedChange,
  ref = createRef() as Ref<HTMLInputElement>,
  ...props
}) => {
  const switchRef = ref || createRef<HTMLInputElement>();

  return (
    <input
      ref={switchRef}
      type="checkbox"
      role="switch"
      class={cn("input", className)}
      checked={checked}
      onChange={(e) =>
        onCheckedChange?.((e.target as HTMLInputElement).checked)
      }
      {...props}
    />
  );
};
