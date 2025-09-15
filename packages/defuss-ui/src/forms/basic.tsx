import { createRef, type Props, type Ref, type VNode } from "defuss";

// --- Input ---
export interface InputProps extends Props {
  className?: string;
  destructive?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  blank?: boolean;
  type?: string;
  ref?: Ref;
  [key: string]: any;
}
export const Input = ({
  className = "",
  destructive = false,
  size,
  blank = false,
  type = "text",
  ref = createRef(),
  ...props
}: InputProps) => (
  <input
    ref={ref}
    type={type}
    className={[
      "uk-input",
      destructive && "uk-form-destructive",
      blank && "uk-form-blank",
      size && `uk-form-${size}`,
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...props}
  />
);

// --- Textarea ---
export interface TextareaProps extends Props {
  className?: string;
  destructive?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  blank?: boolean;
  ref?: Ref;
  [key: string]: any;
}
export const Textarea = ({
  className = "",
  destructive = false,
  size,
  blank = false,
  ref = createRef(),
  ...props
}: TextareaProps) => (
  <textarea
    ref={ref}
    className={[
      "uk-textarea",
      destructive && "uk-form-destructive",
      blank && "uk-form-blank",
      size && `uk-form-${size}`,
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...props}
  />
);

// --- Select ---
export interface SelectProps extends Props {
  className?: string;
  destructive?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  blank?: boolean;
  ref?: Ref;
  children?: VNode;
  [key: string]: any;
}
export const Select = ({
  className = "",
  destructive = false,
  size,
  blank = false,
  ref = createRef(),
  children,
  ...props
}: SelectProps) => (
  <select
    ref={ref}
    className={[
      "uk-select",
      destructive && "uk-form-destructive",
      blank && "uk-form-blank",
      size && `uk-form-${size}`,
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...props}
  >
    {children}
  </select>
);

// --- Radio ---
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

// --- Checkbox ---
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

// --- Range ---
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

// --- ToggleSwitch ---
export interface ToggleSwitchProps extends Props {
  destructive?: boolean;
  className?: string;
  ref?: Ref;
  [key: string]: any;
}
export const ToggleSwitch = ({
  destructive = false,
  className = "",
  ref = createRef(),
  ...props
}: ToggleSwitchProps) => (
  <input
    ref={ref}
    type="checkbox"
    className={[
      "uk-toggle-switch",
      destructive && "uk-toggle-switch-destructive",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...props}
  />
);
