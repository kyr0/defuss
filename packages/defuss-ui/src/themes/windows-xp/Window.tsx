import type { CSSProperties, Props } from "defuss/client";

export interface WindowProps extends Props {
  id?: string;
  title: string;
  width?: number;
  height?: number;
  style?: CSSProperties;
  className?: string;
}

export const Window = ({ title }: WindowProps) => {

  return <div>win: {title}</div>;
}