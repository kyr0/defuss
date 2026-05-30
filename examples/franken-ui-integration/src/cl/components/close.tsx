import { createRef, type Props, type Ref, type VNode } from "defuss";

/** Example: 
 * <Close onClick={handleClose} />
<Close label="Schließen" />
<Close className="my-custom-class" />
 */

export interface CloseProps extends Props {
  className?: string;
  ref?: Ref;
  label?: string; // Accessibility (aria-label)
  [key: string]: any; // HTML props (tabIndex, onClick, etc.)
}

export const Close = ({
  className = "",
  ref = createRef(),
  label = "Close",
  ...props
}: CloseProps) => {
  const baseClass = "uk-close";
  const classes = [baseClass, className].filter(Boolean).join(" ");

  return (
    <button
      ref={ref}
      type="button"
      class={classes}
      data-uk-close
      aria-label={label}
      {...props}
    />
  );
};
