import { createRef, type Props, type Ref, type VNode } from "defuss";

export interface AlertProps extends Props {
  className?: string;
  ref?: Ref;
  destructive?: boolean;
  animation?: boolean;
  duration?: number;
  selClose?: string;
  closeButton?: VNode;
  children?: VNode;
  [key: string]: any; // HTML attributes
}

/**
 * Usage:
 * <Alert>Default info</Alert>
 * <Alert destructive>Danger</Alert>
 * <Alert closeButton={<Close />} animation={false}>Closable</Alert>
 */
export const Alert = ({
  className = "",
  ref = createRef(),
  destructive = false,
  animation = true,
  duration = 150,
  selClose = ".uk-alert-close",
  closeButton,
  children,
  ...props
}: AlertProps) => {
  // Compose core classes
  const baseClass = "uk-alert";
  const destructiveClass = destructive ? "uk-alert-destructive" : "";
  const classes = [baseClass, destructiveClass, className]
    .filter(Boolean)
    .join(" ");

  // Compose options for data-uk-alert
  const options: string[] = [];
  if (animation !== true) options.push("animation: false");
  if (duration !== 150) options.push(`duration: ${duration}`);
  if (selClose !== ".uk-alert-close") options.push(`sel-close: ${selClose}`);
  const dataUkAlert = options.length ? options.join("; ") : true;

  return (
    <div ref={ref} class={classes} data-uk-alert={dataUkAlert} {...props}>
      {/* Optional close button as slot/composed */}
      {closeButton}
      {children}
    </div>
  );
};
