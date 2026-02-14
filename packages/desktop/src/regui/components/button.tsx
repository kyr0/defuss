import { createRef, type Props } from "defuss";

export interface ButtonProps extends Props<HTMLButtonElement> {
  onClick?: () => void;
  disabled?: boolean;
}

export function Button({
  onClick = () => { },
  disabled = false,
  children,
  ref = createRef(),
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
