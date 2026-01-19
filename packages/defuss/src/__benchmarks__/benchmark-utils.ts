// Benchmark utilities for browser DOM benchmarks
// Following js-framework-benchmark methodology

// --- Data Generation ---

let idCounter = 1;

export interface Row {
    id: number;
    label: string;
    selected?: boolean;
}

const adjectives = ["pretty", "large", "big", "small", "tall", "short", "long", "handsome", "plain", "quaint", "clean", "elegant", "easy", "angry", "crazy", "helpful", "mushy", "odd", "unsightly", "adorable", "important", "inexpensive", "cheap", "expensive", "fancy"];
const colours = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"];
const nouns = ["table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger", "pizza", "mouse", "keyboard"];

function _random(max: number) {
    return Math.round(Math.random() * 1000) % max;
}

export function buildData(count: number): Row[] {
    const data: Row[] = [];
    for (let i = 0; i < count; i++) {
        data.push({
            id: idCounter++,
            label: `${adjectives[_random(adjectives.length)]} ${colours[_random(colours.length)]} ${nouns[_random(nouns.length)]}`,
        });
    }
    return data;
}

export function resetIdCounter() {
    idCounter = 1;
}

// --- Assertions ---

export function assertElementCount(container: Element, selector: string, count: number) {
    const elements = container.querySelectorAll(selector);
    if (elements.length !== count) {
        throw new Error(`Expected ${count} elements matching "${selector}", found ${elements.length}`);
    }
}

export function assertTextContent(container: Element, selector: string, text: string) {
    const element = container.querySelector(selector);
    if (!element) {
        throw new Error(`Element matching "${selector}" not found`);
    }
    if (!element.textContent?.includes(text)) {
        throw new Error(`Expected element "${selector}" to contain "${text}", found "${element.textContent}"`);
    }
}

// --- Timing: Mode A (Portable, Double-RAF) ---

/**
 * Portable Mode A: Double requestAnimationFrame
 * Measures time from work start to after next paint (approximates commit)
 */
export function measureRAF(trigger: () => Promise<void> | void): Promise<number> {
    return new Promise<number>((resolve) => {
        requestAnimationFrame(() => {
            const start = performance.now();

            // Trigger the work
            const result = trigger();

            // Handle both async and sync triggers
            Promise.resolve(result).finally(() => {
                // Double RAF: ensures we're past the paint for the update
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        const end = performance.now();
                        resolve(end - start);
                    });
                });
            });
        });
    });
}
