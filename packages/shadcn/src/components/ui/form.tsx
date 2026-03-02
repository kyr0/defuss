import type { ElementProps, FC, Ref } from "defuss";
import { createRef } from "defuss";
import { cn } from "../../utilities/cn.js";

export type FormProps = ElementProps<HTMLFormElement>;
export type FormFieldProps = ElementProps<HTMLDivElement>;

export const Form: FC<FormProps> = ({
  className,
  children,
  ref = createRef() as Ref<HTMLFormElement>,
  ...props
}) => {
  const formRef = ref || createRef<HTMLFormElement>();

  return (
    <form ref={formRef} class={cn("form", className)} {...props}>
      {children}
    </form>
  );
};

export const FormField: FC<FormFieldProps> = ({
  className,
  children,
  ...props
}) => (
  <div class={cn("field", className)} {...props}>
    {children}
  </div>
);
