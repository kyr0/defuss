import type { ElementProps, FC } from "defuss";
import { createRef } from "defuss";
import { cn } from "../../utilities/cn.js";

export type ToasterProps = ElementProps<HTMLDivElement>;
export type ToastProps = ElementProps<HTMLDivElement> & {
    category?: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
};

const ICONS = {
    success: '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
    error: '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
    info: '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    warning: '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>'
};

const toasts = new WeakMap<HTMLElement, {
    remainingTime: number;
    timeoutId: ReturnType<typeof setTimeout> | null;
    startTime: number | null;
}>();

let isPaused = false;
let toasterElement: HTMLElement | null = null;

const closeToast = (element: HTMLElement) => {
    if (!toasts.has(element)) return;

    const state = toasts.get(element)!;
    if (state.timeoutId) clearTimeout(state.timeoutId);
    toasts.delete(element);

    if (element.contains(document.activeElement)) {
        (document.activeElement as HTMLElement).blur();
    }
    element.setAttribute('aria-hidden', 'true');
    element.addEventListener('transitionend', () => element.remove(), { once: true });
};

const pauseAllTimeouts = () => {
    if (isPaused || !toasterElement) return;

    isPaused = true;

    toasterElement.querySelectorAll('.toast:not([aria-hidden="true"])').forEach((element) => {
        if (!toasts.has(element as HTMLElement)) return;

        const state = toasts.get(element as HTMLElement)!;
        if (state.timeoutId) {
            clearTimeout(state.timeoutId);
            state.timeoutId = null;
            state.remainingTime -= Date.now() - (state.startTime || 0);
        }
    });
};

const resumeAllTimeouts = () => {
    if (!isPaused || !toasterElement) return;

    isPaused = false;

    toasterElement.querySelectorAll('.toast:not([aria-hidden="true"])').forEach((element) => {
        if (!toasts.has(element as HTMLElement)) return;

        const state = toasts.get(element as HTMLElement)!;
        if (state.remainingTime !== -1 && !state.timeoutId) {
            if (state.remainingTime > 0) {
                state.startTime = Date.now();
                state.timeoutId = setTimeout(() => closeToast(element as HTMLElement), state.remainingTime);
            } else {
                closeToast(element as HTMLElement);
            }
        }
    });
};

const initToast = (element: HTMLElement) => {
    if ((element as any).dataset.toastInitialized) return;

    const duration = parseInt((element as any).dataset.duration);
    const timeoutDuration = duration !== -1
        ? duration || ((element as any).dataset.category === 'error' ? 5000 : 3000)
        : -1;

    const state = {
        remainingTime: timeoutDuration,
        timeoutId: null as ReturnType<typeof setTimeout> | null,
        startTime: null as number | null,
    };

    if (timeoutDuration !== -1) {
        if (isPaused) {
            state.timeoutId = null;
        } else {
            state.startTime = Date.now();
            state.timeoutId = setTimeout(() => closeToast(element), timeoutDuration);
        }
    }
    toasts.set(element, state);

    (element as any).dataset.toastInitialized = 'true';
};

const initToaster = (container: HTMLDivElement) => {
    if ((container as any).dataset.toasterInitialized) return;
    toasterElement = container;

    container.addEventListener('mouseenter', pauseAllTimeouts);
    container.addEventListener('mouseleave', resumeAllTimeouts);
    container.addEventListener('click', (event) => {
        const actionLink = (event.target as HTMLElement).closest('.toast footer a');
        const actionButton = (event.target as HTMLElement).closest('.toast footer button');
        if (actionLink || actionButton) {
            closeToast((event.target as HTMLElement).closest('.toast') as HTMLElement);
        }
    });

    container.querySelectorAll('.toast:not([data-toast-initialized])').forEach((el) => initToast(el as HTMLElement));
    (container as any).dataset.toasterInitialized = 'true';
    container.dispatchEvent(new CustomEvent('basecoat:initialized'));
};

export interface ToastConfig {
    category?: 'success' | 'error' | 'info' | 'warning';
    title?: string;
    description?: string;
    action?: { label: string; href?: string; onclick?: string };
    cancel?: { label: string; onclick?: string };
    duration?: number;
    icon?: string;
}

export const toast = (config: ToastConfig) => {
    if (!toasterElement) {
        console.error('Cannot create toast: toaster container not found on page.');
        return;
    }

    const {
        category = 'info',
        title,
        description,
        action,
        cancel,
        duration,
        icon,
    } = config;

    const iconHtml = icon || (category && ICONS[category]) || '';
    const titleHtml = title ? `<h2>${title}</h2>` : '';
    const descriptionHtml = description ? `<p>${description}</p>` : '';
    const actionHtml = action?.href
        ? `<a href="${action.href}" class="btn" data-toast-action>${action.label}</a>`
        : action?.onclick
            ? `<button type="button" class="btn" data-toast-action onclick="${action.onclick}">${action.label}</button>`
            : '';
    const cancelHtml = cancel
        ? `<button type="button" class="btn-outline h-6 text-xs px-2.5 rounded-sm" data-toast-cancel onclick="${cancel?.onclick}">${cancel.label}</button>`
        : '';

    const footerHtml = actionHtml || cancelHtml ? `<footer>${actionHtml}${cancelHtml}</footer>` : '';

    const html = `
      <div
        class="toast"
        role="${category === 'error' ? 'alert' : 'status'}"
        aria-atomic="true"
        ${category ? `data-category="${category}"` : ''}
        ${duration !== undefined ? `data-duration="${duration}"` : ''}
      >
        <div class="toast-content">
          ${iconHtml}
          <section>
            ${titleHtml}
            ${descriptionHtml}
          </section>
          ${footerHtml}
        </div>
      </div>
    `;
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const toastElement = template.content.firstChild as HTMLElement;
    toasterElement.appendChild(toastElement);
    initToast(toastElement);
};

// Listen for global toast events
if (typeof document !== 'undefined') {
    document.addEventListener('basecoat:toast', ((event: CustomEvent) => {
        const config = event.detail?.config || {};
        toast(config);
    }) as EventListener);
}

export const Toaster: FC<ToasterProps> = ({ className, children, ...props }) => {
    const toasterRef = createRef<HTMLDivElement>();

    return (
        <div
            ref={toasterRef}
            id="toaster"
            class={cn(className)}
            onMount={() => initToaster(toasterRef.current!)}
            {...props}
        >
            {children}
        </div>
    );
};

export const Toast: FC<ToastProps> = ({ className, category, duration, children, ...props }) => {
    const toastRef = createRef<HTMLDivElement>();

    return (
        <div
            ref={toastRef}
            class={cn("toast", className)}
            role={category === 'error' ? 'alert' : 'status'}
            aria-atomic="true"
            data-category={category}
            data-duration={duration}
            onMount={() => initToast(toastRef.current!)}
            {...props}
        >
            <div class="toast-content">
                {category && <span dangerouslySetInnerHTML={{ __html: ICONS[category] }} />}
                <section>
                    {children}
                </section>
            </div>
        </div>
    );
};

export const ToastTitle: FC<ElementProps<HTMLHeadingElement>> = ({ className, children, ...props }) => (
    <h2 class={cn(className)} {...props}>{children}</h2>
);

export const ToastDescription: FC<ElementProps<HTMLParagraphElement>> = ({ className, children, ...props }) => (
    <p class={cn(className)} {...props}>{children}</p>
);

export const ToastAction: FC<ElementProps<HTMLButtonElement>> = ({ className, children, ...props }) => (
    <footer>
        <button type="button" class={cn("btn", className)} data-toast-action {...props}>
            {children}
        </button>
    </footer>
);
