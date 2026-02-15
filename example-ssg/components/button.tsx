import type { Props, FC } from "defuss";
import { $, createRef } from "defuss";

export interface ButtonProps extends Props {
  className?: string;
}

const ClickButton: FC<ButtonProps> = ({ className }) => {
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

export default ClickButton;