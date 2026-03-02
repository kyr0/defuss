import type { ElementProps, FC, Ref } from "defuss";
import { createRef } from "defuss";
import { cn } from "../../utilities/cn.js";

export type SpinnerProps = ElementProps<SVGSVGElement>;

export const Spinner: FC<SpinnerProps> = ({
  className,
  ref = createRef() as Ref<SVGSVGElement>,
  ...props
}) => {
  const spinnerRef = ref || createRef<SVGSVGElement>();

  return (
    <svg
      ref={spinnerRef}
      aria-label="Loading"
      class={cn("animate-spin", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
};
