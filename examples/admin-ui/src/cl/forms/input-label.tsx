import { createRef, type Props, type Ref, type VNode } from "defuss";

/** Example usage 

<label class="uk-form-label uk-form-label-required" for="form-stacked-text">
  Text
</label>

*/

export interface InputLabelProps extends Props {
  htmlFor?: string;
  className?: string;
  required?: boolean;
  ref?: Ref<HTMLLabelElement>;
  children?: VNode | string | (VNode | string)[];
  [key: string]: any;
}
export const InputLabel = ({
  htmlFor,
  className = "",
  required = false,
  children,
  ref = createRef(),
  ...props
}: InputLabelProps) => (
  <label
    ref={ref}
    for={htmlFor}
    className={[
      "uk-form-label",
      required && "uk-form-label-required",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...props}
  >
    {children}
  </label>
);
