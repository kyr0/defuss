import type { CSSProperties, Props } from "defuss/client";

export interface VBoxProps extends Props {
  id?: string;
  width?: number;
  height?: number;
  style?: CSSProperties;
  className?: string;
}

export const VBox = ({ children }: VBoxProps) => {
  return (
    <div class="flex flex-row">
      {children}
    </div>
  );
}