import type { ElementProps, FC } from "defuss";
import { createRef } from "defuss";
import { cn } from "../../utilities/cn.js";

export type SliderProps = ElementProps<HTMLInputElement> & {
    min?: number;
    max?: number;
    step?: number;
    value?: number;
    onValueChange?: (value: number) => void;
};

export const Slider: FC<SliderProps> = ({
    className,
    min = 0,
    max = 100,
    step = 1,
    value,
    onValueChange,
    ...props
}) => {
    const sliderRef = createRef<HTMLInputElement>();

    const updateSliderValue = () => {
        if (!sliderRef.current) return;
        const val = Number(sliderRef.current.value);
        const percentage = ((val - min) / (max - min)) * 100;
        sliderRef.current.style.setProperty('--slider-value', `${percentage}%`);
        onValueChange?.(val);
    };

    return (
        <input
            ref={sliderRef}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            class={cn("input", className)}
            onInput={updateSliderValue}
            onMount={updateSliderValue}
            {...props}
        />
    );
};
