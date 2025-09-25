import { createRef, type Props, type Ref, type VNode, isJSX } from "defuss";
import { uid } from "../utilities/id.js";
import { InputLabel } from "./input-label.js";

// ----- Fieldset (with optional legend) -----
export interface FieldsetProps extends Props {
  legend?: VNode | string;
  className?: string;
  children?: VNode | string | (VNode | string)[];
  [key: string]: any;
}
export const Fieldset = ({
  legend,
  className = "",
  children,
  ...props
}: FieldsetProps) => (
  <fieldset
    className={["uk-fieldset", className].filter(Boolean).join(" ")}
    {...props}
  >
    {legend && <legend className="uk-legend">{legend}</legend>}
    {children}
  </fieldset>
);

// ----- Input -----
export interface InputProps extends Props {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  destructive?: boolean;
  blank?: boolean;
  type?: string;
  ref?: Ref;
  [key: string]: any;
}
export const Input = ({
  className = "",
  size,
  destructive,
  blank,
  type = "text",
  ref = createRef(),
  ...props
}: InputProps) => (
  <input
    ref={ref}
    type={type}
    className={[
      "uk-input",
      size && `uk-form-${size}`,
      destructive && "uk-form-destructive",
      blank && "uk-form-blank",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...props}
  />
);

// ----- Textarea -----
export interface TextareaProps extends Props {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  destructive?: boolean;
  blank?: boolean;
  ref?: Ref;
  [key: string]: any;
}
export const Textarea = ({
  className = "",
  size,
  destructive,
  blank,
  ref = createRef(),
  ...props
}: TextareaProps) => (
  <textarea
    ref={ref}
    className={[
      "uk-textarea",
      size && `uk-form-${size}`,
      destructive && "uk-form-destructive",
      blank && "uk-form-blank",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...props}
  />
);

// ----- Select -----
export interface SelectProps extends Props {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  destructive?: boolean;
  blank?: boolean;
  ref?: Ref;
  children?: VNode | string | (VNode | string)[];
  [key: string]: any;
}
export const Select = ({
  className = "",
  size,
  destructive,
  blank,
  ref = createRef(),
  children,
  ...props
}: SelectProps) => (
  <select
    ref={ref}
    className={[
      "uk-select",
      size && `uk-form-${size}`,
      destructive && "uk-form-destructive",
      blank && "uk-form-blank",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...props}
  >
    {children}
  </select>
);

// ----- Radio -----
export interface RadioProps extends Props {
  className?: string;
  ref?: Ref;
  [key: string]: any;
}
export const Radio = ({
  className = "",
  ref = createRef(),
  ...props
}: RadioProps) => (
  <input
    ref={ref}
    type="radio"
    className={["uk-radio", className].filter(Boolean).join(" ")}
    {...props}
  />
);

// ----- Checkbox -----
export interface CheckboxProps extends Props {
  className?: string;
  ref?: Ref;
  [key: string]: any;
}
export const Checkbox = ({
  className = "",
  ref = createRef(),
  ...props
}: CheckboxProps) => (
  <input
    ref={ref}
    type="checkbox"
    className={["uk-checkbox", className].filter(Boolean).join(" ")}
    {...props}
  />
);

// ----- Range -----
export interface RangeProps extends Props {
  className?: string;
  ref?: Ref;
  [key: string]: any;
}
export const Range = ({
  className = "",
  ref = createRef(),
  ...props
}: RangeProps) => (
  <input
    ref={ref}
    type="range"
    className={["uk-range", className].filter(Boolean).join(" ")}
    {...props}
  />
);

// ----- ToggleSwitch -----
export type ToggleSwitchColor = "primary" | "destructive";
export interface ToggleSwitchProps extends Props {
  color?: ToggleSwitchColor;
  checked?: boolean;
  disabled?: boolean;
  className?: string;
  ref?: Ref;
  [key: string]: any;
}
export const ToggleSwitch = ({
  color,
  checked,
  disabled,
  className = "",
  ref = createRef(),
  ...props
}: ToggleSwitchProps) => (
  <input
    ref={ref}
    type="checkbox"
    checked={checked}
    disabled={disabled}
    className={[
      "uk-toggle-switch",
      color && `uk-toggle-switch-${color}`,
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...props}
  />
);

// ----- InputIcon -----
export interface InputIconProps extends Props {
  icon?: VNode | string;
  flip?: boolean;
  clickable?: boolean;
  className?: string;
  children?: VNode | string | (VNode | string)[];
  [key: string]: any;
}
export const InputIcon = ({
  icon,
  flip = false,
  clickable = false,
  className = "",
  children,
  ...props
}: InputIconProps) => {
  const Tag: any = clickable ? "a" : "span";
  return (
    <Tag
      className={["uk-form-icon", flip && "uk-form-icon-flip", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {icon || children}
    </Tag>
  );
};

// ----- CustomControl -----
export interface CustomControlProps extends Props {
  target?: string;
  className?: string;
  children?: VNode | string | (VNode | string)[];
  [key: string]: any;
}
export const CustomControl = ({
  target,
  className = "",
  children,
  ...props
}: CustomControlProps) => (
  <div
    data-uk-form-custom={target ? `target: ${target}` : undefined}
    className={className}
    {...props}
  >
    {children}
  </div>
);

// ----- RadioGroup -----
export interface RadioGroupOption {
  label: string;
  value: any;
  [key: string]: any;
}
export interface RadioGroupProps extends Props {
  options: RadioGroupOption[];
  name: string;
  value?: any;
  onChange?: (val: any) => void;
  className?: string;
  [key: string]: any;
}
export const RadioGroup = ({
  options,
  name,
  value,
  onChange,
  className = "",
  ...props
}: RadioGroupProps) => (
  <div
    className={["uk-form-controls uk-form-controls-text", className]
      .filter(Boolean)
      .join(" ")}
    {...props}
  >
    {options.map((opt) => (
      <label key={opt.value} className="mr-2" htmlFor={`${name}-${opt.value}`}>
        <Radio
          name={name}
          value={opt.value}
          checked={value === opt.value}
          onChange={() => onChange?.(opt.value)}
          className="mr-1"
        />
        {opt.label}
      </label>
    ))}
  </div>
);

// ----- CheckboxGroup -----
export interface CheckboxGroupOption {
  label: string;
  value: any;
  [key: string]: any;
}
export interface CheckboxGroupProps extends Props {
  options: CheckboxGroupOption[];
  name: string;
  value?: any[];
  onChange?: (vals: any[]) => void;
  className?: string;
  [key: string]: any;
}
export const CheckboxGroup = ({
  options,
  name,
  value = [],
  onChange,
  className = "",
  ...props
}: CheckboxGroupProps) => (
  <div
    className={["uk-form-controls uk-form-controls-text", className]
      .filter(Boolean)
      .join(" ")}
    {...props}
  >
    {options.map((opt) => (
      <label key={opt.value} className="mr-2" htmlFor={`${name}-${opt.value}`}>
        <Checkbox
          name={name}
          value={opt.value}
          checked={Array.isArray(value) && value.includes(opt.value)}
          onChange={() => {
            if (!onChange) return;
            if (Array.isArray(value) && value.includes(opt.value)) {
              onChange?.(value.filter((v) => v !== opt.value));
            } else {
              onChange?.([...(value || []), opt.value]);
            }
          }}
          className="mr-1"
        />
        {opt.label}
      </label>
    ))}
  </div>
);
