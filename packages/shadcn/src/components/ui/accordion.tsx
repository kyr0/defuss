import type { ElementProps, FC } from "defuss";
import { createRef } from "defuss";
import { cn } from "../../utilities/cn.js";

export type AccordionProps = ElementProps<HTMLElement> & {
    type?: "single" | "multiple";
    collapsible?: boolean;
};
export type AccordionItemProps = ElementProps<HTMLDetailsElement>;
export type AccordionTriggerProps = ElementProps<HTMLElement>;
export type AccordionContentProps = ElementProps<HTMLElement>;

const initAccordion = (accordion: HTMLElement, type: "single" | "multiple", collapsible: boolean) => {
    accordion.addEventListener("click", (event) => {
        if (type !== "single") {
            return;
        }

        const summary = (event.target as HTMLElement).closest("summary");
        if (!summary) return;

        const details = summary.closest("details");
        if (!details) return;

        const isOpen = details.hasAttribute("open");
        if (isOpen && !collapsible) {
            event.preventDefault();
            return;
        }

        accordion.querySelectorAll("details").forEach((detailsEl) => {
            if (detailsEl !== details) {
                detailsEl.removeAttribute("open");
            }
        });
    });
};

export const Accordion: FC<AccordionProps> = ({
    className,
    children,
    type = "single",
    collapsible = false,
    ...props
}) => {
    const ref = createRef<HTMLElement>();

    return (
        <section
            ref={ref}
            class={cn("accordion", className)}
            onMount={() => initAccordion(ref.current!, type, collapsible)}
            {...props}
        >
            {children}
        </section>
    );
};

export const AccordionItem: FC<AccordionItemProps> = ({ className, children, ...props }) => (
    <details class={cn("group border-b last:border-b-0", className)} {...props}>
        {children}
    </details>
);

export const AccordionTrigger: FC<AccordionTriggerProps> = ({ className, children, ...props }) => (
    <summary class={cn("list-none [&::-webkit-details-marker]:hidden w-full cursor-pointer px-3 py-3 text-left text-sm font-medium focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-all outline-none rounded-md", className)} {...props}>
        {children}
    </summary>
);

export const AccordionContent: FC<AccordionContentProps> = ({ className, children, ...props }) => (
    <section class={cn("px-3 pb-3 pt-0 text-sm text-muted-foreground", className)} {...props}>
        {children}
    </section>
);
