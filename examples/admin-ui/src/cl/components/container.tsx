import { createRef, type Props, type Ref, type VNode } from "defuss";

/** Example usage:
 * <Container size="lg">
  <h1>Hello world</h1>
</Container>
 */

export interface ContainerProps extends Props {
  className?: string;
  ref?: Ref;
  size?: "xs" | "sm" | "lg" | "xl" | "expand";
  children?: VNode;
  [key: string]: any; // HTML attributes allowed
}

export const Container = ({
  className = "",
  ref = createRef(),
  size,
  children,
  ...props
}: ContainerProps) => {
  const baseClass = "uk-container";
  const sizeClass = size ? `uk-container-${size}` : "";
  const classes = [baseClass, sizeClass, className].filter(Boolean).join(" ");

  return (
    <div ref={ref} class={classes} {...props}>
      {children}
    </div>
  );
};
