import type { Props } from "defuss";
import { $, createRef } from "defuss";

interface ButtonProps extends Props {
  className?: string;
}

export default function ClickButton({ className }: ButtonProps) {
  const ref = createRef<HTMLButtonElement>();
  const onClick = () => {
    console.log("Button clicked!");
    $(ref).text("Clicked!");
  };

  return (
    <button
      ref={ref}
      type="button"
      id="click-button"
      className={className}
      onClick={onClick}
    >
      Click me
    </button>
  );
}
