import { createRef, type Props, type Ref, type VNode } from "defuss";

export interface InputHelpProps extends Props {
  id?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
  children?: VNode | string | (VNode | string)[];
  [key: string]: any;
}
export const InputHelp = ({
  id,
  className = "",
  children,
  ref = createRef(),
  ...props
}: InputHelpProps) => (
  <div
    id={id}
    ref={ref}
    className={["uk-form-help", className].filter(Boolean).join(" ")}
    {...props}
  >
    {children}
  </div>
);
