import type { ElementProps, FC, Ref } from "defuss";
import { createRef } from "defuss";
import { cn } from "../../utilities/cn.js";

export type TextareaProps = ElementProps<HTMLTextAreaElement>;

export const Textarea: FC<TextareaProps> = ({
  className,
  ref = createRef() as Ref<HTMLTextAreaElement>,
  ...props
}) => {
  const textareaRef = ref || createRef<HTMLTextAreaElement>();

  return (
    <textarea ref={textareaRef} class={cn("textarea", className)} {...props} />
  );
};
