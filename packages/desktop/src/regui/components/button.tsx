import type { Props } from "defuss";

export interface ButtonProps extends Props {
  onClick?: () => void;
  disabled?: boolean;
}

export function Button({
  onClick = () => {},
  disabled = false,
  children,
  ref,
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
