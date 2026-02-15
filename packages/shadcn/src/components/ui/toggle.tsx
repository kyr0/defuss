import type { ElementProps, FC } from "defuss";
import { cn } from "../../utilities/cn.js";
import { buttonVariants } from "./button.js";

export type ToggleProps = ElementProps<HTMLButtonElement> & {
  pressed?: boolean;
};

export type ToggleButtonProps = ToggleProps;

export const ToggleButton: FC<ToggleButtonProps> = ({
  class: classProp,
  className,
  pressed,
  children,
  onClick,
  ...props
}) => {
  const isPressed = pressed === true;

  return (
    <button
      class={cn(
        buttonVariants({ variant: isPressed ? "default" : "outline", size: "sm" }),
        classProp,
        className,
      )}
      aria-pressed={isPressed}
      data-pressed={isPressed}
      onClick={(event) => {
        if (pressed === undefined) {
          const button = (event.target as HTMLElement).closest("button") as HTMLButtonElement | null;
          if (!button) {
            onClick?.(event);
            return;
          }

          const nextPressed = button.getAttribute("aria-pressed") !== "true";

          button.setAttribute("aria-pressed", String(nextPressed));
          button.dataset.pressed = String(nextPressed);

          button.classList.toggle("btn-primary", nextPressed);
          button.classList.toggle("btn-outline", !nextPressed);
        }

        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </button>
  );
};

export const Toggle = ToggleButton;
