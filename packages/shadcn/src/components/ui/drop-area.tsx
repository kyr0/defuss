import type { CSSProperties, ElementProps, FC, Ref } from "defuss";
import { createRef } from "defuss";
import { cn } from "../../utilities/cn.js";

type DropAreaSize = "sm" | "md";

const sizeStyles: Record<DropAreaSize, string> = {
  sm: "px-4 py-3 gap-1",
  md: "px-6 py-8 gap-2",
};

export type DropAreaProps = Omit<
  ElementProps<HTMLDivElement>,
  "size" | "style"
> & {
  size?: DropAreaSize;
  style?: Partial<CSSProperties>;
  onDrop?: (event: DragEvent) => void;
};

export const DropArea: FC<DropAreaProps> = ({
  class: className,
  size = "md",
  children,
  style,
  ref = createRef() as Ref<HTMLDivElement>,
  onDrop,
  ...props
}) => {
  const dropAreaRef = ref || createRef<HTMLDivElement>();

  return (
    <div
      role="button"
      ref={dropAreaRef}
      data-slot="drop-area"
      class={cn(
        "text-muted-foreground flex flex-col items-center justify-center rounded-lg border-0 cursor-[copy] transition-colors hover:bg-muted/50",
        sizeStyles[size],
        className,
      )}
      style={{
        border: "1px dashed var(--color-border)",
        borderRadius: "var(--radius-lg)",
        ...style,
      }}
      {...props}
      onDragOver={(e: DragEvent) => {
        if (onDrop) e.preventDefault();
      }}
      onDrop={(e: DragEvent) => {
        e.preventDefault();
        onDrop?.(e);
      }}
    >
      {children}
    </div>
  );
};
