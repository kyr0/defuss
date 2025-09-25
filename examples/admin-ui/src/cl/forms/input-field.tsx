import { createRef, type Props, type Ref, type VNode } from "defuss";

// ----- InputField -----
export interface InputFieldProps extends Props {
  ref?: Ref<HTMLDivElement>;
  horizontal?: boolean;
  children?: VNode | string | (VNode | string)[];
  className?: string;
  [key: string]: any;
}
export const InputField = ({
  ref = createRef(),
  horizontal = false,
  className = "",
  children,
  ...props
}: InputFieldProps) => {
  return (
    <div
      ref={ref}
      className={[horizontal && "uk-form-controls", className]}
      {...props}
    >
      {children}
    </div>
  );
};
