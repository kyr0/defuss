import type { ElementProps, FC, Ref } from "defuss";
import { createRef } from "defuss";
import { cn } from "../../utilities/cn.js";

export type SliderProps = Omit<
  ElementProps<HTMLInputElement>,
  "value" | "onChange"
> & {
  min?: number;
  max?: number;
  step?: number;
  value?: number | [number, number];
  onValueChange?: (value: number | [number, number]) => void;
};

export const Slider: FC<SliderProps> = ({
  className,
  min = 0,
  max = 100,
  step = 1,
  value,
  onValueChange,
  ref = createRef() as Ref<HTMLInputElement>,
  ...props
}) => {
  const sliderRef = ref || createRef<HTMLInputElement>();

  const updateSliderValue = () => {
    if (!sliderRef.current) return;
    const val = Number(sliderRef.current.value);
    const percentage = ((val - min) / (max - min)) * 100;
    sliderRef.current.style.setProperty("--slider-value", `${percentage}%`);
    onValueChange?.(val);
  };

  return (
    <input
      ref={sliderRef as Ref<HTMLInputElement>}
      type="range"
      min={min}
      max={max}
      step={step}
      value={JSON.stringify(value)}
      class={cn(
        "input",
        props.disabled && "opacity-60 cursor-not-allowed",
        className,
      )}
      onInput={updateSliderValue}
      onMount={updateSliderValue}
      {...props}
    />
  );
};
