import type { ElementProps, FC } from "defuss";
import { createRef } from "defuss";
import { cn } from "../../utilities/cn.js";

export type AccordionProps = ElementProps<HTMLElement>;
export type AccordionItemProps = ElementProps<HTMLDetailsElement>;
export type AccordionTriggerProps = ElementProps<HTMLElement>;
export type AccordionContentProps = ElementProps<HTMLElement>;

const initAccordion = (accordion: HTMLElement) => {
    accordion.addEventListener("click", (event) => {
        const summary = (event.target as HTMLElement).closest("summary");
        if (!summary) return;

        const details = summary.closest("details");
        if (!details) return;

        accordion.querySelectorAll("details").forEach((detailsEl) => {
            if (detailsEl !== details) {
                detailsEl.removeAttribute("open");
            }
        });
    });
};

export const Accordion: FC<AccordionProps> = ({ className, children, ...props }) => {
    const ref = createRef<HTMLElement>();

    return (
        <section
            ref={ref}
            class={cn("accordion", className)}
            onMount={() => initAccordion(ref.current!)}
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
    <summary class={cn("list-none [&::-webkit-details-marker]:hidden w-full focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-all outline-none rounded-md", className)} {...props}>
        {children}
    </summary>
);

export const AccordionContent: FC<AccordionContentProps> = ({ className, children, ...props }) => (
    <section class={cn(className)} {...props}>
        {children}
    </section>
);
