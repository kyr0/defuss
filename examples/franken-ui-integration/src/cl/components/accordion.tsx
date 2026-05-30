import { createRef, type Props, type Ref, type VNode } from "defuss";

/** Example usage:
 
<Accordion multiple>
  <AccordionItem open>
    <AccordionTitle>Section 1</AccordionTitle>
    <AccordionContent>This is content 1</AccordionContent>
  </AccordionItem>
  <AccordionItem>
    <AccordionTitle>Section 2</AccordionTitle>
    <AccordionContent>This is content 2</AccordionContent>
  </AccordionItem>
</Accordion>

 */

// All official component options per docs
export interface AccordionProps extends Props {
  active?: number | false; // accordion opens 0-based index (default) or false
  animation?: boolean; // true (default)
  collapsible?: boolean; // true (default)
  content?: string; // "> .uk-accordion-content"
  duration?: number; // 200 (default)
  multiple?: boolean; // false (default, only one open)
  offset?: number; // 0 (default)
  targets?: string; // "> *"
  toggle?: string; // "> .uk-accordion-title"
  transition?: string; // "ease"
  className?: string;
  ref?: Ref;
  children?: VNode;
  [key: string]: any;
}

function buildUkAccordionOptions({
  active,
  animation,
  collapsible,
  content,
  duration,
  multiple,
  offset,
  targets,
  toggle,
  transition,
}: Partial<AccordionProps>) {
  const opts = [];
  if (active !== undefined) opts.push(`active: ${active}`);
  if (animation !== undefined) opts.push(`animation: ${animation}`);
  if (collapsible !== undefined) opts.push(`collapsible: ${collapsible}`);
  if (content !== undefined) opts.push(`content: ${content}`);
  if (duration !== undefined) opts.push(`duration: ${duration}`);
  if (multiple !== undefined) opts.push(`multiple: ${multiple}`);
  if (offset !== undefined) opts.push(`offset: ${offset}`);
  if (targets !== undefined) opts.push(`targets: ${targets}`);
  if (toggle !== undefined) opts.push(`toggle: ${toggle}`);
  if (transition !== undefined) opts.push(`transition: ${transition}`);
  return opts.length ? opts.join("; ") : undefined;
}

// Main Accordion container
export const Accordion = ({
  className = "",
  ref = createRef(),
  children,
  ...props
}: AccordionProps) => {
  const dataUkAccordion = buildUkAccordionOptions(props);
  return (
    <ul
      ref={ref}
      className={["uk-accordion", className].filter(Boolean).join(" ")}
      data-uk-accordion={dataUkAccordion}
      {...props}
    >
      {children}
    </ul>
  );
};

// Accordion Item
export interface AccordionItemProps extends Props {
  open?: boolean; // If true, will add .uk-open and show this one open.
  className?: string;
  children?: VNode;
  [key: string]: any;
}

export const AccordionItem = ({
  open = false,
  className = "",
  children,
  ...props
}: AccordionItemProps) => (
  <li
    className={[open && "uk-open", className].filter(Boolean).join(" ")}
    {...props}
  >
    {children}
  </li>
);

// Accordion Title
export interface AccordionTitleProps extends Props {
  icon?: VNode; // optional icon slot (prepend in title)
  className?: string;
  children?: VNode;
  [key: string]: any;
}

export const AccordionTitle = ({
  icon,
  className = "",
  children,
  ...props
}: AccordionTitleProps) => (
  <a
    className={["uk-accordion-title", className].filter(Boolean).join(" ")}
    {...props}
  >
    {icon && <span className="uk-accordion-icon">{icon}</span>}
    {children}
  </a>
);

// Accordion Content
export interface AccordionContentProps extends Props {
  className?: string;
  children?: VNode;
  [key: string]: any;
}

export const AccordionContent = ({
  className = "",
  children,
  ...props
}: AccordionContentProps) => (
  <div
    className={["uk-accordion-content", className].filter(Boolean).join(" ")}
    {...props}
  >
    {children}
  </div>
);
