import { createRef, type Props, type Ref, type VNode } from "defuss";

export interface ModalProps extends Props {
  className?: string;
  ref?: Ref;
  open?: boolean; // Controls modal visibility (if managed)
  closeOnBg?: boolean; // bg-close
  closeOnEsc?: boolean; // esc-close
  stack?: boolean;
  pageClass?: string;
  panelClass?: string;
  container?: string | boolean;
  selClose?: string;
  children?: VNode;
  header?: VNode;
  footer?: VNode;
  [key: string]: any; // additional HTML attributes
}

/**
 * Example usage:
 * <Modal open={open} closeOnBg header="Hallo" footer="CTAs">Content</Modal>
 */
export const Modal = ({
  className = "",
  ref = createRef(),
  open,
  closeOnBg = true,
  closeOnEsc = true,
  stack = false,
  pageClass = "",
  panelClass = "",
  container = true,
  selClose,
  children,
  header,
  footer,
  ...props
}: ModalProps) => {
  // Compose main modal dialog class string
  const baseClass = "uk-modal";
  const classes = [baseClass, className].filter(Boolean).join(" ");

  // Create data-uk-modal options string
  const modalOptions = [
    closeOnBg !== false ? null : "bg-close: false",
    closeOnEsc !== false ? null : "esc-close: false",
    stack ? "stack: true" : null,
    pageClass ? `cls-page: ${pageClass}` : null,
    panelClass ? `cls-panel: ${panelClass}` : null,
    container === false
      ? "container: false"
      : typeof container === "string"
        ? `container: ${container}`
        : null,
    selClose ? `sel-close: ${selClose}` : null,
  ]
    .filter(Boolean)
    .join("; ");

  // Modal open state (class and attribute, optionally managed by parent)
  const openAttr = open
    ? { "aria-hidden": "false", style: "display: block;" }
    : {};

  return (
    <div
      ref={ref}
      class={classes}
      data-uk-modal={modalOptions || true}
      tabindex="-1"
      {...openAttr}
      {...props}
    >
      <div class={["uk-modal-dialog", panelClass].filter(Boolean).join(" ")}>
        {header && <div class="uk-modal-header">{header}</div>}
        <div class="uk-modal-body">{children}</div>
        {footer && <div class="uk-modal-footer">{footer}</div>}
      </div>
    </div>
  );
};
