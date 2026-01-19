/**
 * Kitchen Sink Test Suite - Shared test utilities
 */

export const createContainer = (): HTMLDivElement => {
    const container = document.createElement("div");
    container.id = `test-container-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    return container;
};

export const cleanup = (container: HTMLElement) => {
    container.remove();
};

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const nextTick = () => new Promise((r) => queueMicrotask(() => r(undefined)));

export const waitForCondition = async (
    check: () => boolean,
    timeout = 5000,
    interval = 10
): Promise<void> => {
    const start = Date.now();
    while (!check()) {
        if (Date.now() - start > timeout) {
            throw new Error(`Condition not met within ${timeout}ms`);
        }
        await wait(interval);
    }
};

export const getTextContent = (el: Element | null): string => {
    return el?.textContent?.trim() ?? "";
};

export const countElements = (container: Element, selector: string): number => {
    return container.querySelectorAll(selector).length;
};
